"""
Yedekleme Araçları - GUI Uygulaması
Her .bat dosyası için görsel butonlar içeren kontrol paneli
"""

import tkinter as tk
from tkinter import ttk, messagebox
import subprocess
import os
import threading
from datetime import datetime

class BackupToolsApp:
    def __init__(self, root):
        self.root = root
        self.root.title("🔧 Yedekleme Araçları")
        self.root.geometry("520x650")
        self.root.minsize(400, 400)  # Minimum boyut
        
        # Tema renkleri
        self.colors = {
            'bg': '#1a1a2e',
            'card': '#16213e',
            'accent': '#0f3460',
            'primary': '#e94560',
            'success': '#00d9a0',
            'warning': '#ffc107',
            'text': '#ffffff',
            'text_secondary': '#a0a0a0'
        }
        
        self.root.configure(bg=self.colors['bg'])
        
        # Proje klasörü
        self.project_folder = r"C:\Users\berka\Downloads\chatbot"
        self.tools_folder = os.path.join(self.project_folder, "backup-tools")
        
        self.create_widgets()
        
    def create_widgets(self):
        # Ana container
        main_container = tk.Frame(self.root, bg=self.colors['bg'])
        main_container.pack(fill='both', expand=True)
        
        # Başlık (sabit)
        header_frame = tk.Frame(main_container, bg=self.colors['bg'])
        header_frame.pack(fill='x', padx=20, pady=20)
        
        title_label = tk.Label(
            header_frame,
            text="🔧 Yedekleme Araçları",
            font=('Segoe UI', 24, 'bold'),
            fg=self.colors['text'],
            bg=self.colors['bg']
        )
        title_label.pack()
        
        subtitle_label = tk.Label(
            header_frame,
            text="GitHub Senkronizasyon Kontrol Paneli",
            font=('Segoe UI', 11),
            fg=self.colors['text_secondary'],
            bg=self.colors['bg']
        )
        subtitle_label.pack(pady=(5, 0))
        
        # Scrollable alan için Canvas
        canvas_frame = tk.Frame(main_container, bg=self.colors['bg'])
        canvas_frame.pack(fill='both', expand=True, padx=20)
        
        # Canvas ve Scrollbar
        self.canvas = tk.Canvas(canvas_frame, bg=self.colors['bg'], highlightthickness=0)
        scrollbar = ttk.Scrollbar(canvas_frame, orient='vertical', command=self.canvas.yview)
        
        # Scrollable frame
        self.scrollable_frame = tk.Frame(self.canvas, bg=self.colors['bg'])
        
        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )
        
        self.canvas_window = self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=scrollbar.set)
        
        # Canvas genişliğini ayarla
        def configure_canvas(event):
            self.canvas.itemconfig(self.canvas_window, width=event.width)
        
        self.canvas.bind('<Configure>', configure_canvas)
        
        # Mouse wheel scroll
        def on_mousewheel(event):
            self.canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        self.canvas.bind_all("<MouseWheel>", on_mousewheel)
        
        self.canvas.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Buton tanımları
        buttons_config = [
            {
                'name': 'Yedekle',
                'file': 'yedekle.bat',
                'icon': '💾',
                'desc': 'Değişiklikleri GitHub\'a yükle',
                'color': self.colors['primary']
            },
            {
                'name': 'Güncelle',
                'file': 'guncelle.bat',
                'icon': '🔄',
                'desc': 'GitHub\'dan güncel dosyaları çek',
                'color': self.colors['success']
            },
            {
                'name': 'Kontrol Et',
                'file': 'kontrol_et.bat',
                'icon': '🔍',
                'desc': 'Git durumunu kontrol et',
                'color': self.colors['warning']
            },
            {
                'name': 'Yedekleme Sistemi',
                'file': 'yedekleme_sistemi.bat',
                'icon': '⚙️',
                'desc': 'Otomatik yedekleme sistemini çalıştır',
                'color': '#9b59b6'
            },
            {
                'name': 'Kurulum',
                'file': 'github_yedekleme_kurulumu.bat',
                'icon': '📦',
                'desc': 'GitHub yedekleme kurulumunu yap',
                'color': '#3498db'
            }
        ]
        
        for config in buttons_config:
            self.create_button_card(self.scrollable_frame, config)
        
        # Durum çubuğu (sabit, altta)
        self.status_frame = tk.Frame(main_container, bg=self.colors['card'])
        self.status_frame.pack(fill='x', side='bottom', padx=20, pady=15)
        
        self.status_label = tk.Label(
            self.status_frame,
            text="✨ Hazır",
            font=('Segoe UI', 10),
            fg=self.colors['text_secondary'],
            bg=self.colors['card'],
            pady=10
        )
        self.status_label.pack()
        
    def create_button_card(self, parent, config):
        """Tek bir buton kartı oluştur"""
        card = tk.Frame(parent, bg=self.colors['card'], cursor='hand2')
        card.pack(fill='x', pady=8)
        
        # İç padding için frame
        inner_frame = tk.Frame(card, bg=self.colors['card'])
        inner_frame.pack(fill='x', padx=15, pady=12)
        
        # Sol taraf - ikon ve metin
        left_frame = tk.Frame(inner_frame, bg=self.colors['card'])
        left_frame.pack(side='left', fill='x', expand=True)
        
        # Üst satır - ikon ve isim
        top_row = tk.Frame(left_frame, bg=self.colors['card'])
        top_row.pack(fill='x')
        
        icon_label = tk.Label(
            top_row,
            text=config['icon'],
            font=('Segoe UI Emoji', 18),
            fg=self.colors['text'],
            bg=self.colors['card']
        )
        icon_label.pack(side='left')
        
        name_label = tk.Label(
            top_row,
            text=config['name'],
            font=('Segoe UI', 14, 'bold'),
            fg=self.colors['text'],
            bg=self.colors['card']
        )
        name_label.pack(side='left', padx=(10, 0))
        
        # Alt satır - açıklama
        desc_label = tk.Label(
            left_frame,
            text=config['desc'],
            font=('Segoe UI', 9),
            fg=self.colors['text_secondary'],
            bg=self.colors['card']
        )
        desc_label.pack(anchor='w', pady=(5, 0))
        
        # Sağ taraf - çalıştır butonu
        run_btn = tk.Button(
            inner_frame,
            text="Çalıştır",
            font=('Segoe UI', 10, 'bold'),
            fg='white',
            bg=config['color'],
            activebackground=config['color'],
            activeforeground='white',
            border=0,
            padx=20,
            pady=8,
            cursor='hand2',
            command=lambda f=config['file'], n=config['name']: self.run_bat_file(f, n)
        )
        run_btn.pack(side='right')
        
        # Hover efektleri
        def on_enter(e):
            card.configure(bg=self.colors['accent'])
            inner_frame.configure(bg=self.colors['accent'])
            left_frame.configure(bg=self.colors['accent'])
            top_row.configure(bg=self.colors['accent'])
            icon_label.configure(bg=self.colors['accent'])
            name_label.configure(bg=self.colors['accent'])
            desc_label.configure(bg=self.colors['accent'])
            
        def on_leave(e):
            card.configure(bg=self.colors['card'])
            inner_frame.configure(bg=self.colors['card'])
            left_frame.configure(bg=self.colors['card'])
            top_row.configure(bg=self.colors['card'])
            icon_label.configure(bg=self.colors['card'])
            name_label.configure(bg=self.colors['card'])
            desc_label.configure(bg=self.colors['card'])
        
        card.bind('<Enter>', on_enter)
        card.bind('<Leave>', on_leave)
        
    def run_bat_file(self, filename, display_name):
        """BAT dosyasını çalıştır"""
        bat_path = os.path.join(self.tools_folder, filename)
        
        if not os.path.exists(bat_path):
            messagebox.showerror("Hata", f"Dosya bulunamadı:\n{bat_path}")
            return
        
        self.status_label.config(text=f"⏳ {display_name} çalışıyor...")
        self.root.update()
        
        def run_in_thread():
            try:
                # BAT dosyasını yeni bir CMD penceresinde çalıştır
                subprocess.Popen(
                    f'start cmd /k "{bat_path}"',
                    shell=True,
                    cwd=self.project_folder
                )
                self.root.after(0, lambda: self.status_label.config(
                    text=f"✅ {display_name} başlatıldı"
                ))
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Hata", str(e)))
                self.root.after(0, lambda: self.status_label.config(
                    text="❌ Hata oluştu"
                ))
        
        thread = threading.Thread(target=run_in_thread)
        thread.start()

def main():
    root = tk.Tk()
    app = BackupToolsApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
