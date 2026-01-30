"""
Chatbot Kontrol Merkezi - Unified Command Center
Tüm komut satırı işlemlerini tek bir arayüzde birleştiren uygulama
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox
import subprocess
import threading
import os
import webbrowser
from datetime import datetime

class CommandCenter:
    def __init__(self, root):
        self.root = root
        self.root.title("🎛️ Chatbot Kontrol Merkezi")
        self.root.geometry("900x700")
        self.root.minsize(800, 600)
        
        # Tema renkleri
        self.colors = {
            'bg': '#0f0f1a',
            'sidebar': '#1a1a2e',
            'card': '#16213e',
            'accent': '#0f3460',
            'primary': '#667eea',
            'success': '#10b981',
            'warning': '#f59e0b',
            'danger': '#ef4444',
            'text': '#ffffff',
            'text_secondary': '#94a3b8',
            'text_muted': '#64748b'
        }
        
        self.root.configure(bg=self.colors['bg'])
        
        # Proje klasörü
        self.project_folder = r"C:\Users\berka\Desktop\chatbot"
        self.backup_tools = os.path.join(self.project_folder, "backup-tools")
        
        # Aktif kategori
        self.active_category = None
        
        # Çalışan process
        self.running_process = None
        
        # Thread güvenliği için kilit
        self.process_lock = threading.Lock()
        
        # Komut çalışıyor mu?
        self.is_running = False
        
        # HTTP sunucu process'i (ayrıca takip edilir)
        self.server_process = None
        
        self.create_widgets()
        self.show_category('backup')  # Varsayılan kategori

    def create_widgets(self):
        # Ana container
        main_container = tk.Frame(self.root, bg=self.colors['bg'])
        main_container.pack(fill='both', expand=True)
        
        # Sol Sidebar - Kategoriler
        self.sidebar = tk.Frame(main_container, bg=self.colors['sidebar'], width=200)
        self.sidebar.pack(side='left', fill='y')
        self.sidebar.pack_propagate(False)
        
        # Logo
        logo_frame = tk.Frame(self.sidebar, bg=self.colors['primary'])
        logo_frame.pack(fill='x', pady=(0, 20))
        
        logo_label = tk.Label(
            logo_frame,
            text="🎛️ Kontrol Merkezi",
            font=('Segoe UI', 14, 'bold'),
            fg='white',
            bg=self.colors['primary'],
            pady=20
        )
        logo_label.pack()
        
        # Kategoriler
        self.category_buttons = {}
        categories = [
            ('backup', '💾 Yedekleme', self.colors['primary']),
            ('firebase', '🚀 Firebase', self.colors['warning']),
            ('server', '🌐 Sunucu', self.colors['success']),
            ('git', '📦 Git', '#9b59b6'),
            ('system', '⚙️ Sistem', self.colors['text_muted'])
        ]
        
        for cat_id, cat_name, cat_color in categories:
            btn = tk.Button(
                self.sidebar,
                text=cat_name,
                font=('Segoe UI', 11),
                fg='white',
                bg=self.colors['sidebar'],
                activebackground=self.colors['accent'],
                activeforeground='white',
                border=0,
                pady=15,
                cursor='hand2',
                anchor='w',
                padx=20,
                command=lambda c=cat_id: self.show_category(c)
            )
            btn.pack(fill='x')
            self.category_buttons[cat_id] = btn
            
            # Hover efekti
            btn.bind('<Enter>', lambda e, b=btn: b.configure(bg=self.colors['accent']))
            btn.bind('<Leave>', lambda e, b=btn, c=cat_id: self.update_button_style(b, c))
        
        # Sağ Ana Alan
        self.main_area = tk.Frame(main_container, bg=self.colors['bg'])
        self.main_area.pack(side='left', fill='both', expand=True)
        
        # Üst - Kategori Başlığı ve Butonlar
        self.header_frame = tk.Frame(self.main_area, bg=self.colors['bg'])
        self.header_frame.pack(fill='x', padx=20, pady=20)
        
        self.category_title = tk.Label(
            self.header_frame,
            text="",
            font=('Segoe UI', 24, 'bold'),
            fg='white',
            bg=self.colors['bg']
        )
        self.category_title.pack(anchor='w')
        
        self.category_desc = tk.Label(
            self.header_frame,
            text="",
            font=('Segoe UI', 10),
            fg=self.colors['text_secondary'],
            bg=self.colors['bg']
        )
        self.category_desc.pack(anchor='w', pady=(5, 0))
        
        # Butonlar Alanı
        self.buttons_frame = tk.Frame(self.main_area, bg=self.colors['bg'])
        self.buttons_frame.pack(fill='x', padx=20)
        
        # Alt - Terminal Çıktısı
        output_label = tk.Label(
            self.main_area,
            text="📟 Terminal Çıktısı",
            font=('Segoe UI', 11, 'bold'),
            fg=self.colors['text_secondary'],
            bg=self.colors['bg']
        )
        output_label.pack(anchor='w', padx=20, pady=(20, 5))
        
        self.output_text = scrolledtext.ScrolledText(
            self.main_area,
            font=('Consolas', 10),
            bg='#0a0a0f',
            fg='#10b981',
            insertbackground='white',
            height=12,
            wrap='word',
            state='disabled'
        )
        self.output_text.pack(fill='both', expand=True, padx=20, pady=(0, 20))
        
        # Durum çubuğu
        self.status_bar = tk.Frame(self.main_area, bg=self.colors['card'])
        self.status_bar.pack(fill='x', side='bottom')
        
        self.status_label = tk.Label(
            self.status_bar,
            text="✨ Hazır",
            font=('Segoe UI', 9),
            fg=self.colors['text_secondary'],
            bg=self.colors['card'],
            pady=8
        )
        self.status_label.pack(side='left', padx=15)
        
        self.stop_btn = tk.Button(
            self.status_bar,
            text="⏹️ Durdur",
            font=('Segoe UI', 9),
            fg='white',
            bg=self.colors['danger'],
            border=0,
            padx=15,
            pady=5,
            cursor='hand2',
            command=self.stop_process
        )
        self.stop_btn.pack(side='right', padx=15, pady=5)
        
    def update_button_style(self, btn, cat_id):
        """Buton stilini güncelle"""
        if cat_id == self.active_category:
            btn.configure(bg=self.colors['accent'])
        else:
            btn.configure(bg=self.colors['sidebar'])
    
    def show_category(self, category):
        """Kategori göster"""
        self.active_category = category
        
        # Sidebar butonlarını güncelle
        for cat_id, btn in self.category_buttons.items():
            if cat_id == category:
                btn.configure(bg=self.colors['accent'])
            else:
                btn.configure(bg=self.colors['sidebar'])
        
        # Butonları temizle
        for widget in self.buttons_frame.winfo_children():
            widget.destroy()
        
        # Kategoriye göre butonları göster
        if category == 'backup':
            self.show_backup_menu()
        elif category == 'firebase':
            self.show_firebase_menu()
        elif category == 'server':
            self.show_server_menu()
        elif category == 'git':
            self.show_git_menu()
        elif category == 'system':
            self.show_system_menu()
    
    def create_action_button(self, parent, text, description, color, command, row, col):
        """Aksiyon butonu oluştur"""
        frame = tk.Frame(parent, bg=self.colors['card'], cursor='hand2')
        frame.grid(row=row, column=col, padx=8, pady=8, sticky='nsew')
        
        inner = tk.Frame(frame, bg=self.colors['card'])
        inner.pack(fill='both', expand=True, padx=15, pady=15)
        
        title = tk.Label(
            inner,
            text=text,
            font=('Segoe UI', 12, 'bold'),
            fg='white',
            bg=self.colors['card']
        )
        title.pack(anchor='w')
        
        desc = tk.Label(
            inner,
            text=description,
            font=('Segoe UI', 9),
            fg=self.colors['text_secondary'],
            bg=self.colors['card'],
            wraplength=200,
            justify='left'
        )
        desc.pack(anchor='w', pady=(5, 10))
        
        btn = tk.Button(
            inner,
            text="Çalıştır",
            font=('Segoe UI', 10, 'bold'),
            fg='white',
            bg=color,
            activebackground=color,
            border=0,
            padx=20,
            pady=8,
            cursor='hand2',
            command=command
        )
        btn.pack(anchor='w')
        
        # Hover efekti
        def on_enter(e):
            frame.configure(bg=self.colors['accent'])
            inner.configure(bg=self.colors['accent'])
            title.configure(bg=self.colors['accent'])
            desc.configure(bg=self.colors['accent'])
            
        def on_leave(e):
            frame.configure(bg=self.colors['card'])
            inner.configure(bg=self.colors['card'])
            title.configure(bg=self.colors['card'])
            desc.configure(bg=self.colors['card'])
        
        frame.bind('<Enter>', on_enter)
        frame.bind('<Leave>', on_leave)
        
        return frame
    
    def show_backup_menu(self):
        """Yedekleme menüsü"""
        self.category_title.config(text="💾 Yedekleme")
        self.category_desc.config(text="GitHub yedekleme ve senkronizasyon işlemleri")
        
        # Grid yapılandırması
        self.buttons_frame.columnconfigure(0, weight=1)
        self.buttons_frame.columnconfigure(1, weight=1)
        
        actions = [
            ("💾 Yedekle", "Değişiklikleri GitHub'a yükle", self.colors['primary'], self.backup_push, 0, 0),
            ("🔄 Güncelle", "GitHub'dan güncel dosyaları çek", self.colors['success'], self.backup_pull, 0, 1),
            ("🔍 Kontrol Et", "Git durumunu kontrol et", self.colors['warning'], self.backup_status, 1, 0),
            ("⚙️ Yedekleme Sistemi", "Otomatik yedekleme sistemini çalıştır", '#9b59b6', self.backup_system, 1, 1),
        ]
        
        for text, desc, color, cmd, row, col in actions:
            self.create_action_button(self.buttons_frame, text, desc, color, cmd, row, col)
    
    def show_firebase_menu(self):
        """Firebase menüsü"""
        self.category_title.config(text="🚀 Firebase")
        self.category_desc.config(text="Firebase hosting ve deployment işlemleri")
        
        self.buttons_frame.columnconfigure(0, weight=1)
        self.buttons_frame.columnconfigure(1, weight=1)
        
        actions = [
            ("🚀 Deploy", "Canlı siteye yayınla", self.colors['warning'], self.firebase_deploy, 0, 0),
            ("🔐 Login", "Firebase'e giriş yap", self.colors['primary'], self.firebase_login, 0, 1),
            ("🌐 Serve", "Lokal önizleme başlat", self.colors['success'], self.firebase_serve, 1, 0),
            ("📋 Projeler", "Firebase projelerini listele", self.colors['text_muted'], self.firebase_projects, 1, 1),
        ]
        
        for text, desc, color, cmd, row, col in actions:
            self.create_action_button(self.buttons_frame, text, desc, color, cmd, row, col)
    
    def show_server_menu(self):
        """Sunucu menüsü"""
        self.category_title.config(text="🌐 Sunucu")
        self.category_desc.config(text="Yerel geliştirme sunucusu kontrolleri")
        
        self.buttons_frame.columnconfigure(0, weight=1)
        self.buttons_frame.columnconfigure(1, weight=1)
        
        actions = [
            ("▶️ Sunucu Başlat", "localhost:8080 sunucusunu başlat", self.colors['success'], self.server_start, 0, 0),
            ("⏹️ Sunucu Durdur", "Çalışan sunucuyu durdur", self.colors['danger'], self.server_stop, 0, 1),
            ("🌐 Tarayıcıda Aç", "Admin paneli tarayıcıda aç", self.colors['primary'], self.open_browser, 1, 0),
        ]
        
        for text, desc, color, cmd, row, col in actions:
            self.create_action_button(self.buttons_frame, text, desc, color, cmd, row, col)
    
    def show_git_menu(self):
        """Git menüsü"""
        self.category_title.config(text="📦 Git")
        self.category_desc.config(text="Git versiyon kontrol işlemleri")
        
        self.buttons_frame.columnconfigure(0, weight=1)
        self.buttons_frame.columnconfigure(1, weight=1)
        
        actions = [
            ("📊 Status", "Değişiklikleri görüntüle", self.colors['primary'], self.git_status, 0, 0),
            ("📜 Log", "Son 10 commit'i göster", '#9b59b6', self.git_log, 0, 1),
            ("📥 Pull", "Uzak depodan çek", self.colors['success'], self.git_pull, 1, 0),
            ("📤 Push", "Uzak depoya gönder", self.colors['warning'], self.git_push, 1, 1),
            ("🔍 Diff", "Değişiklikleri karşılaştır", self.colors['text_muted'], self.git_diff, 2, 0),
        ]
        
        for text, desc, color, cmd, row, col in actions:
            self.create_action_button(self.buttons_frame, text, desc, color, cmd, row, col)
    
    def show_system_menu(self):
        """Sistem menüsü"""
        self.category_title.config(text="⚙️ Sistem")
        self.category_desc.config(text="Sistem ve geliştirme ortamı işlemleri")
        
        self.buttons_frame.columnconfigure(0, weight=1)
        self.buttons_frame.columnconfigure(1, weight=1)
        
        actions = [
            ("📁 Klasörü Aç", "Proje klasörünü dosya gezgininde aç", self.colors['primary'], self.open_folder, 0, 0),
            ("💻 VS Code", "Projeyi VS Code'da aç", '#007acc', self.open_vscode, 0, 1),
            ("🖥️ Terminal", "Yeni terminal penceresi aç", self.colors['text_muted'], self.open_terminal, 1, 0),
            ("🧹 Cache Temizle", "Geçici dosyaları temizle", self.colors['danger'], self.clear_cache, 1, 1),
        ]
        
        for text, desc, color, cmd, row, col in actions:
            self.create_action_button(self.buttons_frame, text, desc, color, cmd, row, col)
    
    # ========================
    # KOMUT FONKSİYONLARI
    # ========================
    
    def log(self, message, color='#10b981'):
        """Terminal çıktısına yaz"""
        self.output_text.config(state='normal')
        timestamp = datetime.now().strftime('[%H:%M:%S]')
        self.output_text.insert('end', f"{timestamp} {message}\n")
        self.output_text.see('end')
        self.output_text.config(state='disabled')
    
    def clear_output(self):
        """Terminal çıktısını temizle"""
        self.output_text.config(state='normal')
        self.output_text.delete(1.0, 'end')
        self.output_text.config(state='disabled')
    
    def run_command(self, command, cwd=None, show_window=False):
        """Komut çalıştır (thread-safe)"""
        # Eş zamanlı çalışmayı önle
        with self.process_lock:
            if self.is_running:
                self.log("⚠️ Başka bir komut çalışıyor, lütfen bekleyin...")
                self.status_label.config(text="⚠️ Komut çalışıyor, bekleyin")
                return
            self.is_running = True
        
        if cwd is None:
            cwd = self.project_folder
            
        self.status_label.config(text=f"⏳ Çalışıyor: {command[:50]}...")
        self.log(f"▶️ Çalıştırılıyor: {command}")
        
        def run():
            try:
                if show_window:
                    # Yeni pencerede aç
                    subprocess.Popen(
                        f'start cmd /k "{command}"',
                        shell=True,
                        cwd=cwd
                    )
                    self.root.after(0, lambda: self.log("✅ Yeni pencerede açıldı"))
                    self.root.after(0, lambda: self.status_label.config(text="✅ Tamamlandı"))
                else:
                    # Çıktıyı yakala
                    with self.process_lock:
                        self.running_process = subprocess.Popen(
                            command,
                            shell=True,
                            cwd=cwd,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            encoding='utf-8',
                            errors='replace'
                        )
                        current_process = self.running_process
                    
                    for line in current_process.stdout:
                        self.root.after(0, lambda l=line: self.log(l.strip()))
                    
                    current_process.wait()
                    
                    if current_process.returncode == 0:
                        self.root.after(0, lambda: self.log("✅ Başarıyla tamamlandı"))
                        self.root.after(0, lambda: self.status_label.config(text="✅ Tamamlandı"))
                    else:
                        self.root.after(0, lambda rc=current_process.returncode: self.log(f"❌ Hata kodu: {rc}"))
                        self.root.after(0, lambda: self.status_label.config(text="❌ Hata oluştu"))
                        
            except Exception as e:
                error_msg = str(e)
                self.root.after(0, lambda: self.log(f"❌ Hata: {error_msg}"))
                self.root.after(0, lambda: self.status_label.config(text="❌ Hata oluştu"))
            finally:
                with self.process_lock:
                    self.running_process = None
                    self.is_running = False
        
        thread = threading.Thread(target=run, daemon=True)
        thread.start()
    
    def stop_process(self):
        """Çalışan işlemi durdur (thread-safe)"""
        with self.process_lock:
            if self.running_process:
                try:
                    self.running_process.terminate()
                    self.log("⏹️ İşlem durduruldu")
                    self.status_label.config(text="⏹️ Durduruldu")
                except Exception as e:
                    self.log(f"⚠️ Durdurma hatası: {str(e)}")
                finally:
                    self.running_process = None
                    self.is_running = False
            else:
                self.log("⚠️ Durdurulacak işlem yok")
                self.status_label.config(text="⚠️ Aktif işlem yok")
    
    # Yedekleme komutları
    def backup_push(self):
        self.clear_output()
        # Python ile tutarlı tarih formatı oluştur
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        commit_message = f"Yedekleme - {timestamp}"
        self.run_command(f'git add . && git commit -m "{commit_message}" && git push origin main')
    
    def backup_pull(self):
        self.clear_output()
        self.run_command('git pull origin main')
    
    def backup_status(self):
        self.clear_output()
        self.run_command('git status')
    
    def backup_system(self):
        self.clear_output()
        bat_path = os.path.join(self.backup_tools, 'yedekleme_sistemi.bat')
        self.run_command(f'"{bat_path}"', show_window=True)
    
    # Firebase komutları
    def firebase_deploy(self):
        self.clear_output()
        self.run_command('firebase deploy --only hosting')
    
    def firebase_login(self):
        self.clear_output()
        self.run_command('firebase login', show_window=True)
    
    def firebase_serve(self):
        self.clear_output()
        self.run_command('firebase serve', show_window=True)
    
    def firebase_projects(self):
        self.clear_output()
        self.run_command('firebase projects:list')
    
    # Sunucu komutları
    def server_start(self):
        self.clear_output()
        
        # Eğer zaten çalışan bir sunucu varsa uyar
        if self.server_process is not None and self.server_process.poll() is None:
            self.log("⚠️ Sunucu zaten çalışıyor! Önce durdurun.")
            self.status_label.config(text="⚠️ Sunucu zaten aktif")
            return
        
        try:
            # Sunucuyu arka planda başlat ve process'i sakla
            self.server_process = subprocess.Popen(
                ['python', '-m', 'http.server', '8080'],
                cwd=os.path.join(self.project_folder, 'public'),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_CONSOLE
            )
            self.log("✅ Sunucu başlatıldı (PID: {})".format(self.server_process.pid))
            self.log("💡 Tarayıcıda http://localhost:8080 adresini açın")
            self.status_label.config(text="🌐 Sunucu çalışıyor (PID: {})".format(self.server_process.pid))
        except Exception as e:
            self.log(f"❌ Sunucu başlatılamadı: {str(e)}")
            self.status_label.config(text="❌ Sunucu başlatılamadı")
    
    def server_stop(self):
        self.clear_output()
        
        if self.server_process is None:
            self.log("⚠️ Durdurulacak sunucu bulunamadı.")
            self.status_label.config(text="⚠️ Sunucu aktif değil")
            return
        
        if self.server_process.poll() is not None:
            self.log("⚠️ Sunucu zaten durmuş.")
            self.server_process = None
            self.status_label.config(text="⚠️ Sunucu zaten durmuş")
            return
        
        try:
            pid = self.server_process.pid
            self.server_process.terminate()
            self.server_process.wait(timeout=5)
            self.log(f"✅ Sunucu durduruldu (PID: {pid})")
            self.status_label.config(text="⏹️ Sunucu durduruldu")
        except subprocess.TimeoutExpired:
            self.server_process.kill()
            self.log("⚠️ Sunucu zorla durduruldu")
            self.status_label.config(text="⚠️ Sunucu zorla durduruldu")
        except Exception as e:
            self.log(f"❌ Sunucu durdurulamadı: {str(e)}")
            self.status_label.config(text="❌ Hata oluştu")
        finally:
            self.server_process = None
    
    def open_browser(self):
        webbrowser.open('http://localhost:8080/admin-panel-optimized.html')
        self.log("🌐 Tarayıcı açılıyor...")
    
    # Git komutları
    def git_status(self):
        self.clear_output()
        self.run_command('git status')
    
    def git_log(self):
        self.clear_output()
        self.run_command('git log --oneline -10')
    
    def git_pull(self):
        self.clear_output()
        self.run_command('git pull origin main')
    
    def git_push(self):
        self.clear_output()
        self.run_command('git push origin main')
    
    def git_diff(self):
        self.clear_output()
        self.run_command('git diff --stat')
    
    # Sistem komutları
    def open_folder(self):
        """Proje klasörünü dosya gezgininde aç"""
        try:
            if not os.path.exists(self.project_folder):
                self.log(f"❌ Klasör bulunamadı: {self.project_folder}")
                self.status_label.config(text="❌ Klasör bulunamadı")
                return
            
            os.startfile(self.project_folder)
            self.log("📁 Klasör açıldı")
            self.status_label.config(text="📁 Klasör açıldı")
        except OSError as e:
            self.log(f"❌ Klasör açılamadı: {str(e)}")
            self.status_label.config(text="❌ Klasör açılamadı")
        except Exception as e:
            self.log(f"❌ Beklenmeyen hata: {str(e)}")
            self.status_label.config(text="❌ Hata oluştu")
    
    def open_vscode(self):
        self.run_command(f'code "{self.project_folder}"')
        self.log("💻 VS Code açılıyor...")
    
    def open_terminal(self):
        self.run_command('start cmd', show_window=True)
    
    def clear_cache(self):
        """Proje önbelleğini ve geçici dosyaları temizle"""
        self.clear_output()
        self.log("🧹 Önbellek temizleniyor...")
        self.status_label.config(text="🧹 Temizleniyor...")
        
        import shutil
        import glob
        
        cleaned_items = []
        total_size = 0
        
        def get_size(path):
            """Dosya veya klasör boyutunu hesapla"""
            try:
                if os.path.isfile(path):
                    return os.path.getsize(path)
                elif os.path.isdir(path):
                    total = 0
                    for dirpath, dirnames, filenames in os.walk(path):
                        for f in filenames:
                            fp = os.path.join(dirpath, f)
                            try:
                                total += os.path.getsize(fp)
                            except:
                                pass
                    return total
            except:
                return 0
            return 0
        
        def format_size(size):
            """Boyutu okunabilir formata çevir"""
            if size < 1024:
                return f"{size} B"
            elif size < 1024 * 1024:
                return f"{size / 1024:.1f} KB"
            else:
                return f"{size / (1024 * 1024):.1f} MB"
        
        # 1. __pycache__ klasörlerini temizle
        for root, dirs, files in os.walk(self.project_folder):
            # .git klasörünü atla
            if '.git' in root:
                continue
            for dir_name in dirs:
                if dir_name == '__pycache__':
                    cache_path = os.path.join(root, dir_name)
                    try:
                        size = get_size(cache_path)
                        shutil.rmtree(cache_path)
                        total_size += size
                        cleaned_items.append(f"📁 {cache_path}")
                        self.log(f"  🗑️ Silindi: __pycache__ ({format_size(size)})")
                    except Exception as e:
                        self.log(f"  ⚠️ Silinemedi: {cache_path} - {str(e)}")
        
        # 2. .pyc dosyalarını temizle
        pyc_files = glob.glob(os.path.join(self.project_folder, "**", "*.pyc"), recursive=True)
        for pyc_file in pyc_files:
            if '.git' not in pyc_file:
                try:
                    size = get_size(pyc_file)
                    os.remove(pyc_file)
                    total_size += size
                    cleaned_items.append(f"📄 {pyc_file}")
                except Exception as e:
                    self.log(f"  ⚠️ Silinemedi: {pyc_file}")
        
        if pyc_files:
            self.log(f"  🗑️ {len(pyc_files)} adet .pyc dosyası silindi")
        
        # 3. .firebase klasörünü temizle (deployment cache)
        firebase_cache = os.path.join(self.project_folder, '.firebase')
        if os.path.exists(firebase_cache):
            try:
                size = get_size(firebase_cache)
                shutil.rmtree(firebase_cache)
                total_size += size
                cleaned_items.append(f"📁 {firebase_cache}")
                self.log(f"  🗑️ Silindi: .firebase cache ({format_size(size)})")
            except Exception as e:
                self.log(f"  ⚠️ .firebase silinemedi: {str(e)}")
        
        # 4. temp_ ile başlayan geçici dosyaları temizle
        temp_files = glob.glob(os.path.join(self.project_folder, "temp_*"))
        for temp_file in temp_files:
            try:
                size = get_size(temp_file)
                if os.path.isfile(temp_file):
                    os.remove(temp_file)
                else:
                    shutil.rmtree(temp_file)
                total_size += size
                cleaned_items.append(f"📄 {temp_file}")
                self.log(f"  🗑️ Silindi: {os.path.basename(temp_file)} ({format_size(size)})")
            except Exception as e:
                self.log(f"  ⚠️ Silinemedi: {temp_file}")
        
        # 5. Log dosyalarını temizle (opsiyonel - sadece eski log'lar)
        log_files = glob.glob(os.path.join(self.project_folder, "*.log"))
        if log_files:
            self.log(f"  📝 {len(log_files)} adet log dosyası bulundu (korunuyor)")
        
        # Özet
        self.log("")
        if cleaned_items:
            self.log(f"✅ Önbellek temizlendi!")
            self.log(f"   📊 Toplam {len(cleaned_items)} öğe silindi")
            self.log(f"   💾 {format_size(total_size)} alan kazanıldı")
            self.status_label.config(text=f"✅ {format_size(total_size)} temizlendi")
        else:
            self.log("✅ Temizlenecek önbellek bulunamadı, proje zaten temiz!")
            self.status_label.config(text="✅ Proje zaten temiz")

def main():
    root = tk.Tk()
    app = CommandCenter(root)
    root.mainloop()

if __name__ == "__main__":
    main()
