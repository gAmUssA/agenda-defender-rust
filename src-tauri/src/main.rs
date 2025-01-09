#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AgendaItem {
    title: String,
    duration: i64,  // Duration in seconds
    start_time: Option<DateTime<Local>>,
}

struct AgendaState {
    items: Vec<AgendaItem>,
    current_index: usize,
    current_start_time: Option<DateTime<Local>>,
}

impl AgendaState {
    fn new() -> Self {
        Self {
            items: Vec::new(),
            current_index: 0,
            current_start_time: None,
        }
    }
}

struct AppState {
    agenda: Mutex<AgendaState>,
}

#[tauri::command]
fn parse_agenda_text(input: String) -> Vec<AgendaItem> {
    input.lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.splitn(2, ' ').collect();
            let (duration, title) = match parts.len() {
                2 => {
                    let duration = if let Some(time) = parts[0].split(':').collect::<Vec<&str>>().get(0..2) {
                        let hours: i64 = time[0].parse().unwrap_or(0);
                        let minutes: i64 = time[1].parse().unwrap_or(0);
                        hours * 3600 + minutes * 60
                    } else {
                        300  // Default 5 minutes
                    };
                    (duration, parts[1].to_string())
                },
                _ => (300, line.to_string()),  // Default 5 minutes
            };
            AgendaItem {
                title,
                duration,
                start_time: None,
            }
        })
        .collect()
}

#[tauri::command]
fn add_agenda_items(items: Vec<AgendaItem>, state: tauri::State<AppState>) {
    let mut agenda = state.agenda.lock().unwrap();
    agenda.items = items;
    agenda.current_index = 0;
    agenda.current_start_time = None;
}

#[tauri::command]
fn start_timer(state: tauri::State<AppState>) {
    let mut agenda = state.agenda.lock().unwrap();
    agenda.current_start_time = Some(Local::now());
}

#[tauri::command]
fn get_remaining_time(state: tauri::State<AppState>) -> i64 {
    let agenda = state.agenda.lock().unwrap();
    if let Some(start_time) = agenda.current_start_time {
        if let Some(item) = agenda.items.get(agenda.current_index) {
            let elapsed = Local::now().signed_duration_since(start_time).num_seconds();
            let remaining = item.duration - elapsed;
            if remaining < 0 {
                0
            } else {
                remaining
            }
        } else {
            0
        }
    } else {
        0
    }
}

#[tauri::command]
fn get_current_item(state: tauri::State<AppState>) -> Option<AgendaItem> {
    let agenda = state.agenda.lock().unwrap();
    agenda.items.get(agenda.current_index).cloned()
}

#[tauri::command]
fn next_item(state: tauri::State<AppState>) -> Option<AgendaItem> {
    let mut agenda = state.agenda.lock().unwrap();
    agenda.current_index += 1;
    agenda.current_start_time = None;
    agenda.items.get(agenda.current_index).cloned()
}

fn main() {
    let app_state = AppState {
        agenda: Mutex::new(AgendaState::new()),
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            parse_agenda_text,
            add_agenda_items,
            start_timer,
            get_remaining_time,
            get_current_item,
            next_item,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
