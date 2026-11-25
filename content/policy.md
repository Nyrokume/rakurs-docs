---
title: Политики и настройки
nav: Политики
description: Политика решает, что, когда и сколько собирает агент. Здесь наследование, триггеры снимков, размытие, исключения, квоты, расписание, сроки хранения и полный пример.
---

Политика — YAML-документ, который описывает, что и когда собирает агент. Политики хранятся на сервере с историей версий, подписываются при публикации и доставляются агентам при следующем подключении. Агент применяет новую политику без перезапуска.

## Наследование

Политики назначаются на уровни и сливаются сверху вниз:

```mermaid Порядок применения
flowchart LR
  O[Организация<br/>база] --> G[Группа ПК / OU<br/>отдел продаж] --> P[Конкретный ПК<br/>исключение] --> U[Учётная запись<br/>на время расследования]
```

Правила слияния:

- Скалярные значения (интервал, качество) переопределяются нижним уровнем.
- Списки исключений и размытия **объединяются**: нижний уровень может только добавить исключение, но не убрать унаследованное.
- Ограничения организации (`limits`) нижние уровни ослабить не могут: если на уровне организации запрещены DNS-запросы, группа их не включит.
- Каждая политика ссылается на **цель обработки** из реестра целей ([Минимизация данных](privacy.html)). Без цели политика не публикуется.

## Пример политики

```yaml policy/sales.yaml
apiVersion: rakurs/v1
kind: Policy
metadata:
  name: sales-default
  purpose: worktime-and-apps        # ссылка на цель обработки из приказа
  appliesTo:
    groups: ["OU=Sales,DC=corp,DC=local"]
  owner: it-monitoring@corp.local

schedule:
  timezone: Asia/Yekaterinburg
  workHours:                         # вне этих часов ничего не собирается
    - days: [mon, tue, wed, thu, fri]
      from: "08:30"
      to: "18:00"
  holidaysCalendar: ru-production    # производственный календарь

screenshots:
  enabled: true
  interval: 300s                     # минимум 30s, проверяется схемой
  triggers:
    windowSwitch:
      enabled: true
      minGap: 20s                    # не чаще раза в 20 секунд
    appLaunch: ["1cv8.exe", "EXCEL.EXE"]
    usbInserted: true
    idleReturn: 10m
  scope: allMonitors                 # allMonitors | activeMonitor | activeWindow
  maxSide: 1920
  format: webp
  quality: 70
  dedup:
    hash: dhash
    threshold: 5

privacy:
  skip:                              # окно активно — снимок не делается
    - process: "BankClient.exe"
    - titleRegex: "(?i)госуслуги|личный кабинет"
    - domain: "online.sberbank.ru"
  blur:                              # окно размывается на кадре
    - process: "Telegram.exe"
    - process: "WhatsApp.exe"
    - process: "KeePassXC.exe"
    - domain: "mail.yandex.ru"
  pause:
    allowed: true
    maxPerDay: 60m
  viewNotice: onView                 # never | daily | onView — уведомлять ли сотрудника о просмотре его кадров

telemetry:
  foregroundWindow: true
  idle: { threshold: 300s }
  processes: true
  sessions: true
  usb: true
  network: { connections: true, dns: false }
  software: { interval: 6h }
  autoruns: true
  hardware: { interval: 24h }
  security: true
  print: false
  registry:
    watch:
      - 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run'
      - 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run'
      - 'HKLM\SYSTEM\CurrentControlSet\Enum\USBSTOR'

ocr:
  enabled: true
  region: activeWindow               # full | activeWindow
  maskPatterns: [card, passport, snils, inn]

quotas:
  agentQueue: 2GiB
  uploadBandwidth: 256kbps           # потолок, чтобы не мешать работе
  uploadWindow: any                  # any | offHours

retention:                           # сроки — из приказа, не дольше
  screenshots: 90d
  ocrText: 90d
  events: 365d
  inventory: 3y
```

## Справочник полей

### `schedule`

| Поле | Тип | По умолчанию | Описание |
|---|---|---|---|
| `timezone` | IANA | часовой пояс ПК | Часовой пояс для расписания |
| `workHours` | список | пн–пт 09:00–18:00 | Вне интервалов данные, привязанные к человеку, не собираются |
| `holidaysCalendar` | строка | `ru-production` | Нерабочие праздничные дни по производственному календарю |

### `screenshots`

| Поле | Тип | По умолчанию | Ограничения |
|---|---|---|---|
| `interval` | длительность | `300s` | от `30s` до `3600s` |
| `triggers.windowSwitch.minGap` | длительность | `20s` | от `5s` |
| `triggers.appLaunch` | список процессов | пусто | — |
| `scope` | перечисление | `allMonitors` | `allMonitors`, `activeMonitor`, `activeWindow` |
| `maxSide` | пиксели | `1920` | от `960` до `3840` |
| `format` | перечисление | `webp` | `webp`, `avif` |
| `quality` | число | `70` | от `40` до `90` |
| `dedup.threshold` | число | `5` | от `0` (выкл) до `16` |

### `privacy`

Селекторы окна: `process` (имя исполняемого файла), `class` (класс окна), `titleRegex` (регулярное выражение RE2 по заголовку), `domain` (домен активной вкладки браузера). Все селекторы регистронезависимы.

| Поле | Что делает |
|---|---|
| `skip` | Окно активно — снимка нет, пишется событие `capture_skipped` с причиной |
| `blur` | Прямоугольник окна размывается, если окно видно на кадре |
| `pause.allowed` | Разрешена ли кнопка «Личное время» |
| `pause.maxPerDay` | Суммарный лимит пауз в день |
| `viewNotice` | Уведомление сотрудника о просмотре его кадров: `never` — нет, `daily` — сводка за день в окне агента, `onView` — сразу после просмотра. Запись в журнал аудита пишется всегда |

### `retention`

Сроки хранения задаются **для каждого класса данных** и не могут превышать сроки, утверждённые в приказе о мониторинге (они заводятся в реестр целей на сервере, и схема проверяет политику по ним).

## Проверка политики

Перед публикацией сервер проверяет:

1. Соответствие JSON Schema версии `rakurs/v1`.
2. Ограничения организации (`limits`) не ослаблены.
3. Указана цель обработки, и все включённые сборщики входят в её перечень.
4. Сроки хранения не превышают утверждённых.
5. Включение `network.dns`, `print` или `ocr.region: full` требует поля `justification` и второй подписи (владелец системы).

Публикация пишется в журнал аудита: кто, когда, какая разница с предыдущей версией.

## Доставка и применение

- Агент получает политику при подключении и раз в 15 минут спрашивает, нет ли новой версии (`If-None-Match` по хэшу).
- Подпись — Ed25519, открытый ключ сервера политик зашит в агент при установке и может ротироваться только подписанным обновлением.
- Если подпись не сходится или схема неизвестна, агент продолжает работать по последней действующей политике и отправляет событие `policy_rejected`.
- Изменение политики, затрагивающее собираемые данные, отображается в окне сотрудника со строкой «Что изменилось с ДД.ММ».
