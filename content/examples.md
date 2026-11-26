---
title: Примеры
nav: Примеры
description: Готовые примеры: политика сбора, запись события и экраны консоли.
---

## Пример политики

Политика задаёт, что, когда и сколько собирает агент. Вне рабочих часов данные, привязанные к человеку, не собираются; личные окна размываются до сохранения.

```yaml policy/sales.yaml
schedule:
  timezone: Asia/Yekaterinburg
  workHours:
    - days: [mon, tue, wed, thu, fri]
      from: "08:30"
      to: "18:00"

screenshots:
  enabled: true
  interval: 300s           # снимок раз в 5 минут
  triggers:
    windowSwitch: { enabled: true, minGap: 20s }
    usbInserted: true
  maxSide: 1920
  format: webp

privacy:
  blur:                    # окно размывается на кадре
    - process: "Telegram.exe"
    - domain: "mail.yandex.ru"
  viewNotice: onView       # уведомлять сотрудника о просмотре его снимков

telemetry:
  foregroundWindow: true
  idle: { threshold: 600s } # порог простоя — 10 минут
  processes: true
  usb: true

retention:                 # сроки хранения — из приказа
  screenshots: 90d
  events: 365d
```

## Пример записи события

Время в приложениях считается на сервере из потока событий:

```text
08:58:12  foreground  EXCEL.EXE   "Бюджет 2027.xlsx — Excel"
09:14:40  foreground  chrome.exe  "Задачи — Jira"   domain=jira.corp.local
09:31:05  idle_start  (нет ввода 600 с)
09:42:18  idle_end
```

Одно событие в хранилище:

```json
{
  "ts": "2026-11-26T09:14:40+05:00",
  "device_id": "WKS-1042",
  "kind": "foreground",
  "process": "chrome.exe",
  "title": "Задачи — Jira",
  "domain": "jira.corp.local",
  "state": "active"
}
```

## Пример экранов и отчётов

**Лента дня сотрудника.** Горизонтальная шкала рабочего дня: сегменты приложений с цветом по категории, отдельные цвета для простоя, паузы и нерабочего времени. Под шкалой — таблица сегментов (время, приложение, заголовок окна, домен, число кадров). Клик по миниатюре открывает снимок — с указанием причины и записью в журнал аудита.

**Отчёты в консоли:**

| Отчёт | Что показывает | Выгрузка |
|---|---|---|
| Время в приложениях | По группе и периоду, с категориями | CSV, XLSX |
| Табель | Начало, конец, активное время по дням | XLSX, формат для 1С:ЗУП |
| Инвентаризация ПО | Программы, версии, число установок | CSV |
| USB и носители | Подключения по ПК и людям | CSV |
