---
title: Протокол и API
nav: Протокол и API
description: Как агент обменивается данными с сервером (gRPC) и консоль с API (REST): контракт, коды ошибок, интеграции с AD, SIEM и вебхуки.
---

## Транспорт

- gRPC поверх HTTP/2, TLS 1.3, взаимная аутентификация по сертификатам ([ADR-003](adr.html#adr-003)).
- Порт по умолчанию `8443/tcp`, исходящее соединение от агента. Поддерживается HTTP CONNECT-прокси из системных настроек WinHTTP.
- Сжатие сообщений gRPC — `zstd` для событий; кадры уже сжаты и передаются как есть.
- Все сообщения несут `agent_id` из сертификата; поле в теле игнорируется, если не совпадает.

## gRPC-контракт

```proto proto/yasnost/agent/v1/agent.proto
syntax = "proto3";
package yasnost.agent.v1;

import "google/protobuf/timestamp.proto";

service AgentService {
  // Первичная регистрация по токену установки. Единственный вызов без mTLS.
  rpc Enroll(EnrollRequest) returns (EnrollResponse);

  // Поток данных от агента. Сервер подтверждает пакеты по seq.
  rpc Upload(stream UploadBatch) returns (stream UploadAck);

  // Текущая политика. Если хэш совпал, вернёт NOT_MODIFIED.
  rpc GetPolicy(GetPolicyRequest) returns (SignedPolicy);

  // Манифест обновления для кольца агента.
  rpc GetUpdate(GetUpdateRequest) returns (UpdateManifest);

  // Продление сертификата за 30 дней до истечения.
  rpc RenewCertificate(RenewRequest) returns (RenewResponse);
}

message EnrollRequest {
  string install_token = 1;
  bytes  csr_der       = 2;   // ECDSA P-256
  DeviceInfo device    = 3;
}

message DeviceInfo {
  string hostname      = 1;
  string os_version    = 2;   // 10.0.26100
  string agent_version = 3;
  string machine_sid   = 4;
  repeated string mac  = 5;
}

message EnrollResponse {
  string agent_id        = 1;
  bytes  certificate_der = 2;
  bytes  ca_chain_der    = 3;
  SignedPolicy policy    = 4;
}

message UploadBatch {
  uint64 first_seq = 1;
  repeated Event events = 2;
  repeated Frame frames = 3;
}

message Event {
  uint64 seq = 1;
  google.protobuf.Timestamp ts = 2;
  string session_id = 3;
  string user_sid   = 4;       // пусто, если ознакомления нет
  oneof body {
    Foreground foreground = 10;
    Idle       idle       = 11;
    Process    process    = 12;
    Session    session    = 13;
    Usb        usb        = 14;
    NetConn    net        = 15;
    Software   software   = 16;
    RegChange  reg        = 17;
    Health     health     = 18;
    CaptureSkipped skipped = 19;
  }
}

message Foreground {
  string process = 1;
  string title   = 2;
  string domain  = 3;
  uint32 pid     = 4;
}

message Frame {
  uint64 seq     = 1;
  string frame_id = 2;
  google.protobuf.Timestamp ts = 3;
  string trigger = 4;          // interval | window_switch | usb | idle_return
  uint32 monitor = 5;
  uint32 width   = 6;
  uint32 height  = 7;
  uint64 dhash   = 8;
  bool   blurred = 9;
  string mime    = 10;         // image/webp
  bytes  data    = 11;         // до 4 МБ, иначе чанками
}

message UploadAck {
  uint64 acked_through_seq = 1;
  uint32 retry_after_ms    = 2; // сервер просит притормозить
}

message SignedPolicy {
  string policy_id = 1;
  uint32 version   = 2;
  bytes  body_json = 3;
  bytes  sha256    = 4;
  bytes  signature = 5;        // Ed25519 над sha256
}
```

Остальные сообщения (`Idle`, `Process`, `Usb` и так далее) описаны в репозитории контракта; их поля совпадают с колонками [модели данных](data-model.html).

### Подтверждение и повтор

- Агент отправляет пакеты по 100 событий или 1 МБ, что наступит раньше.
- Сервер подтверждает `acked_through_seq` после записи в ClickHouse и S3. Агент удаляет из очереди всё до этого номера.
- При разрыве агент повторяет с первого неподтверждённого `seq`; сервер отсекает дубликаты по `(agent_id, seq)`.
- `retry_after_ms` — механизм обратного давления: при перегрузке сервер замедляет агентов, не разрывая соединение.

## Коды ошибок

| gRPC-код | Когда | Что делает агент |
|---|---|---|
| `UNAUTHENTICATED` | Сертификат отозван или истёк | Прекращает отправку, показывает в трее «нет связи», пишет в журнал; данные остаются в очереди |
| `PERMISSION_DENIED` | ПК выведен из эксплуатации | Останавливает сбор, ждёт удаления |
| `RESOURCE_EXHAUSTED` | Квота организации или перегрузка | Экспоненциальная пауза от 30 с до 15 мин |
| `FAILED_PRECONDITION` | Версия агента ниже минимальной | Запрашивает обновление |
| `UNAVAILABLE` | Сеть, перезапуск сервера | Повтор с паузой и случайным разбросом |

## REST API консоли

Базовый путь `/api/v1`, аутентификация через OIDC (корпоративный SSO) или Kerberos, ответы в JSON. Каждый запрос проверяется по RBAC; запросы к персональным данным пишутся в аудит.

```http Лента дня сотрудника
GET /api/v1/persons/7b1e.../timeline?date=2026-11-25 HTTP/1.1
Authorization: Bearer eyJ...
```

```json Ответ
{
  "person": { "id": "7b1e...", "name": "Иванова А. С.", "department": "Продажи" },
  "date": "2026-11-25",
  "summary": { "active": "6h41m", "idle": "48m", "paused": "30m", "noData": "0m" },
  "segments": [
    { "from": "08:58:12", "to": "09:14:40", "app": "Excel", "category": "work", "frames": 3 },
    { "from": "09:14:40", "to": "09:31:05", "app": "Chrome", "domain": "jira.corp.local", "category": "work", "frames": 2 }
  ]
}
```

```http Просмотр кадра с причиной
POST /api/v1/frames/0f3a...:view HTTP/1.1
Content-Type: application/json

{ "reason": "Служебная проверка №14 от 20.11.2026" }
```

```json Ответ
{ "url": "https://s3.corp.local/yasnost-frames/...&X-Amz-Expires=60", "expiresIn": 60, "auditId": 918274 }
```

| Метод и путь | Назначение | Роли |
|---|---|---|
| `GET /devices` | Список ПК, состояние агентов | admin, security |
| `GET /persons/{id}/timeline` | Лента дня | manager (своё подразделение), security |
| `GET /reports/apps` | Время в приложениях по группе | manager, security |
| `GET /search/ocr?q=` | Поиск по тексту на кадрах | security |
| `POST /frames/{id}:view` | Ссылка на кадр, с причиной | security, manager — если разрешено |
| `GET /policies`, `POST /policies/{id}/versions` | Политики | admin (черновик), owner (публикация) |
| `POST /persons/{id}/acknowledgements` | Отметка об ознакомлении | hr |
| `POST /persons/{id}/export` | Выгрузка данных по запросу сотрудника | owner |
| `GET /audit` | Журнал аудита | auditor |

## Интеграции {#integratsii}

### Active Directory

Синхронизация по LDAPS раз в 15 минут: пользователи, группы, OU, руководитель (`manager`), признак отключения. Отключённые учётные записи помечаются как уволенные, и для них запускается отсчёт срока удаления.

### SIEM

Оповещения и события безопасности уходят по syslog (RFC 5424, TLS) в формате CEF:

```text
CEF:0|Yasnost|Yasnost|1.0|usb_insert|USB-накопитель подключён|5|dvchost=PC-0142 suser=CORP\ivanova cs1Label=device cs1=Kingston DataTraveler 3.0 cs2Label=serial cs2=60A44C... rt=Nov 25 2026 10:42:18
```

### Вебхуки

Для правил можно задать вебхук (например, в корпоративный мессенджер). Тело содержит только тип события, ПК и ссылку в консоль — без кадров и заголовков окон.
