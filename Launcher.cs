using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using System.Drawing;
using System.Net;
using System.Threading;

namespace RevenueTrackerLauncher
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                // تحديد مجلد ثابت ومحمي في AppData المحلي للمستخدم لضمان الحفظ الدائم للبيانات الحسابية (localStorage)
                string appDataDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "دفتر الحسابات"
                );

                // إنشاء المجلد إذا لم يكن موجوداً مسبقاً
                if (!Directory.Exists(appDataDir))
                {
                    Directory.CreateDirectory(appDataDir);
                }

                // إصدار الموارد المدمجة في هذا الملف التنفيذي الحالي
                double embeddedVersion = 1.8; 

                // قراءة رقم الإصدار المحلي الحالي المخزن في مجلد AppData للجهاز
                double localVersion = 0.0;
                string localVersionPath = Path.Combine(appDataDir, "local_version.txt");

                if (File.Exists(localVersionPath))
                {
                    try
                    {
                        double.TryParse(
                            File.ReadAllText(localVersionPath).Trim(),
                            System.Globalization.NumberStyles.Any,
                            System.Globalization.CultureInfo.InvariantCulture,
                            out localVersion
                        );
                    }
                    catch {}
                }

                // إذا كان الملف التنفيذي جديداً أو يحتوي على إصدار أعلى من الإصدار المحلي، نقوم بفرض استخراج الموارد الجديدة
                bool forceExtraction = (embeddedVersion > localVersion);

                // قراءة واستخراج الملفات المدمجة كـ Resources داخل ملف الـ EXE
                var assembly = System.Reflection.Assembly.GetExecutingAssembly();
                string[] resourceNames = assembly.GetManifestResourceNames();

                foreach (string resourceName in resourceNames)
                {
                    string fileName = resourceName;
                    
                    // إزالة اسم مساحة العمل إن وجد
                    if (resourceName.StartsWith("RevenueTrackerLauncher."))
                    {
                        fileName = resourceName.Substring("RevenueTrackerLauncher.".Length);
                    }

                    // تخطي ملفات النظام الفرعية
                    if (fileName.EndsWith(".resources", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    string destPath = Path.Combine(appDataDir, fileName);

                    // استخراج وتحديث الملف في المجلد المحلي إذا لم يكن موجوداً مسبقاً، أو إذا فرضنا الاستخراج بسبب وجود إصدار مدمج أحدث
                    if (!File.Exists(destPath) || forceExtraction)
                    {
                        using (Stream stream = assembly.GetManifestResourceStream(resourceName))
                        {
                            if (stream != null)
                            {
                                using (FileStream fs = new FileStream(destPath, FileMode.Create, FileAccess.Write))
                                {
                                    stream.CopyTo(fs);
                                }
                            }
                        }
                    }
                }

                // تحديث ملف الإصدار المحلي ليتطابق مع الإصدار المدمج الجديد بعد استخراج الموارد
                if (forceExtraction)
                {
                    try
                    {
                        File.WriteAllText(localVersionPath, embeddedVersion.ToString(System.Globalization.CultureInfo.InvariantCulture));
                        localVersion = embeddedVersion; // مزامنة المتغير المحلي للفحص السحابي اللاحق
                    }
                    catch {}
                }

                // 2. تشغيل فحص وتثبيت التحديثات تلقائياً عبر الإنترنت
                CheckAndApplyUpdates(appDataDir, localVersion);

                string htmlPath = Path.Combine(appDataDir, "index.html");

                // التأكد من استخراج أو وجود ملف index.html بنجاح تام
                if (!File.Exists(htmlPath))
                {
                    MessageBox.Show(
                        "حدث خطأ أثناء استخراج ملفات تشغيل البرنامج الأساسية!",
                        "خطأ في التشغيل",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                // العثور على مسار متصفح Microsoft Edge بنظام ويندوز
                string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
                if (!File.Exists(edgePath))
                {
                    edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
                }

                // تحويل مسار الملف إلى رابط URL قياسي مشفر بشكل صحيح (يتعامل مع المسافات والحروف العربية)
                string fileUrl = new Uri(htmlPath).AbsoluteUri;

                // الحصول على أبعاد منطقة العمل النشطة (بدون شريط المهام) لملء الشاشة بالكامل في وضع النافذة الواسعة (WINDOWIDE)
                int winWidth = System.Windows.Forms.Screen.PrimaryScreen.WorkingArea.Width;
                int winHeight = System.Windows.Forms.Screen.PrimaryScreen.WorkingArea.Height;
                int posX = 0;
                int posY = 0;

                // إعداد متغيرات التشغيل لفتح واجهة ويب مستقلة ونظيفة (Edge App Mode) بوضع النافذة الواسعة الممتدة لرؤية كل شيء دفعة واحدة
                string arguments = string.Format(
                    "--app=\"{0}\" --window-size={1},{2} --window-position={3},{4} --start-maximized",
                    fileUrl,
                    winWidth,
                    winHeight,
                    posX,
                    posY
                );
                
                ProcessStartInfo psi = new ProcessStartInfo();
                if (File.Exists(edgePath))
                {
                    psi.FileName = edgePath;
                }
                else
                {
                    // محاولة التشغيل المباشر من خلال المتغيرات البيئية إذا لم يكن في المسارات القياسية
                    psi.FileName = "msedge.exe";
                }
                
                psi.Arguments = arguments;
                psi.UseShellExecute = true;
                
                // تشغيل التطبيق المكتبي الفاخر بشكل فوري
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "حدث خطأ غير متوقع أثناء تشغيل البرنامج:\n" + ex.Message,
                    "خطأ تشغيل",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        /// <summary>
        /// فحص وتطبيق التحديثات في الخلفية مع الحفاظ على العمل في حال عدم الاتصال (Offline)
        /// </summary>
        static void CheckAndApplyUpdates(string appDataDir, double localVersion)
        {
            // تفعيل بروتوكول TLS 1.2 لضمان إمكانية الاتصال بـ GitHub بأمان تام
            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; // TLS 1.2
            }
            catch {}

            string defaultUrl = "https://raw.githubusercontent.com/Emizo59/revenue-tracker/main/update.txt";
            string updateUrl = defaultUrl;
            string customUrlPath = Path.Combine(appDataDir, "update_url.txt");

            if (File.Exists(customUrlPath))
            {
                try
                {
                    string customUrl = File.ReadAllText(customUrlPath).Trim();
                    
                    // إذا كان الملف المحلي يحتوي على رابط المستودع القديم (moataz) أو المستودع المؤقت (book1-revenue-tracker)، نقوم بترقيته تلقائياً لمستودعك الجديد
                    if (customUrl.Contains("githubusercontent.com/moataz/") || customUrl.Contains("book1-revenue-tracker"))
                    {
                        customUrl = defaultUrl;
                        File.WriteAllText(customUrlPath, defaultUrl);
                    }

                    if (!string.IsNullOrEmpty(customUrl) && Uri.IsWellFormedUriString(customUrl, UriKind.Absolute))
                    {
                        updateUrl = customUrl;
                    }
                }
                catch {}
            }
            else
            {
                // حفظ الرابط الافتراضي كمرجع للمستخدم
                try
                {
                    File.WriteAllText(customUrlPath, updateUrl);
                }
                catch {}
            }

            // محاولة جلب ملف الإصدار السحابي بمهلة اتصال قصيرة (1.5 ثانية) لضمان عدم تعليق البرنامج إذا كان أوفلاين
            string[] updateLines = null;
            double remoteVersion = 1.0;

            try
            {
                using (var client = new TimeoutWebClient(1500))
                {
                    client.Encoding = System.Text.Encoding.UTF8;
                    string remoteData = client.DownloadString(updateUrl);
                    if (!string.IsNullOrEmpty(remoteData))
                    {
                        updateLines = remoteData.Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                        if (updateLines.Length > 0)
                        {
                            double.TryParse(
                                updateLines[0].Trim(),
                                System.Globalization.NumberStyles.Any,
                                System.Globalization.CultureInfo.InvariantCulture,
                                out remoteVersion
                            );
                        }
                    }
                }
            }
            catch
            {
                // في حال عدم وجود إنترنت أو انتهاء المهلة، يتم الانتقال فوراً للملفات المحلية دون أي توقف
                return;
            }

            // إذا توفر إصدار أحدث على الإنترنت، نفتح واجهة التنزيل الفورية
            if (remoteVersion > localVersion && updateLines != null && updateLines.Length > 1)
            {
                Application.EnableVisualStyles();
                using (var updateForm = new UpdateForm(appDataDir, updateLines, remoteVersion))
                {
                    updateForm.ShowDialog();
                }
            }
        }
    }

    /// <summary>
    /// فئة مخصصة من WebClient تدعم تعيين مهلة زمنية للاتصال (Timeout)
    /// </summary>
    class TimeoutWebClient : WebClient
    {
        private int timeout;
        public TimeoutWebClient(int timeoutMs)
        {
            this.timeout = timeoutMs;
        }

        protected override WebRequest GetWebRequest(Uri address)
        {
            WebRequest w = base.GetWebRequest(address);
            w.Timeout = this.timeout;
            return w;
        }
    }

    /// <summary>
    /// واجهة رسومية زمردية مسطحة لتمثيل شاشة التحميل والتحديث التلقائي
    /// </summary>
    class UpdateForm : Form
    {
        private Panel progressBg;
        private Panel progressFg;
        private Label lblTitle;
        private Label lblStatus;
        private string appDataDir;
        private string[] updateLines;
        private double remoteVersion;

        public UpdateForm(string appDataDir, string[] updateLines, double remoteVersion)
        {
            this.appDataDir = appDataDir;
            this.updateLines = updateLines;
            this.remoteVersion = remoteVersion;

            this.Size = new Size(460, 180);
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(15, 23, 42); // Slate-900 لون فخم متطابق مع البرنامج
            this.DoubleBuffered = true;

            // رسم إطار زمردي مسطح حول الواجهة
            this.Paint += (s, e) => {
                using (Pen pen = new Pen(Color.FromArgb(16, 185, 129), 2)) // Emerald-500
                {
                    e.Graphics.DrawRectangle(pen, 0, 0, this.Width - 1, this.Height - 1);
                }
            };

            // عنوان الواجهة
            lblTitle = new Label();
            lblTitle.Text = "تحديث دفتر الحسابات التلقائي";
            lblTitle.Font = new Font("Segoe UI", 13.5f, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(248, 250, 252);
            lblTitle.Size = new Size(420, 30);
            lblTitle.Location = new Point(20, 25);
            lblTitle.TextAlign = ContentAlignment.TopRight;
            lblTitle.RightToLeft = RightToLeft.Yes;

            // نص الحالة والتقدم الحالي
            lblStatus = new Label();
            lblStatus.Text = "جاري الاتصال والتحقق من ملفات التحديث...";
            lblStatus.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(148, 163, 184); // Slate-400
            lblStatus.Size = new Size(420, 25);
            lblStatus.Location = new Point(20, 68);
            lblStatus.TextAlign = ContentAlignment.TopRight;
            lblStatus.RightToLeft = RightToLeft.Yes;

            // خلفية شريط التحدم
            progressBg = new Panel();
            progressBg.Size = new Size(420, 8);
            progressBg.Location = new Point(20, 110);
            progressBg.BackColor = Color.FromArgb(30, 41, 59); // Slate-800

            // مؤشر شريط التقدم الزمردي
            progressFg = new Panel();
            progressFg.Size = new Size(0, 8);
            progressFg.Location = new Point(0, 0);
            progressFg.BackColor = Color.FromArgb(16, 185, 129); // Emerald-500

            progressBg.Controls.Add(progressFg);

            this.Controls.Add(lblTitle);
            this.Controls.Add(lblStatus);
            this.Controls.Add(progressBg);

            this.Load += (s, e) => StartDownload();
        }

        private void StartDownload()
        {
            Thread t = new Thread(() => {
                try
                {
                    int fileCount = updateLines.Length - 1;
                    int currentFile = 0;

                    using (var client = new WebClient())
                    {
                        client.Encoding = System.Text.Encoding.UTF8;
                        
                        for (int i = 1; i < updateLines.Length; i++)
                        {
                            string line = updateLines[i].Trim();
                            if (string.IsNullOrEmpty(line)) continue;

                            int eqIdx = line.IndexOf('=');
                            if (eqIdx == -1) continue;

                            string fileName = line.Substring(0, eqIdx).Trim();
                            string fileUrl = line.Substring(eqIdx + 1).Trim();

                            this.Invoke((MethodInvoker)delegate {
                                lblStatus.Text = string.Format("تحميل الملف {0} من {1}: {2}...", currentFile + 1, fileCount, fileName);
                            });

                            string destPath = Path.Combine(appDataDir, fileName);

                            // تحميل وحفظ الملف مباشرة في مجلد التطبيق المحلي
                            client.DownloadFile(fileUrl, destPath);
                            currentFile++;

                            // تحديث عرض شريط التقدم
                            int percentWidth = (int)(((double)currentFile / fileCount) * 420);
                            this.Invoke((MethodInvoker)delegate {
                                progressFg.Width = percentWidth;
                            });
                        }
                    }

                    // حفظ رقم الإصدار الجديد محلياً
                    string localVersionPath = Path.Combine(appDataDir, "local_version.txt");
                    File.WriteAllText(localVersionPath, remoteVersion.ToString(System.Globalization.CultureInfo.InvariantCulture));

                    this.Invoke((MethodInvoker)delegate {
                        lblStatus.Text = "اكتمل التحديث بنجاح! جاري تشغيل دفتر الحسابات...";
                    });
                    
                    Thread.Sleep(1000); // مهلة قصيرة لإظهار اكتمال التحميل بصرياً للمستخدم
                }
                catch (Exception ex)
                {
                    this.Invoke((MethodInvoker)delegate {
                        MessageBox.Show("حدث خطأ أثناء تنزيل التحديث:\n" + ex.Message, "فشل التحديث", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    });
                }
                finally
                {
                    this.Invoke((MethodInvoker)delegate {
                        this.Close();
                    });
                }
            });
            t.IsBackground = true;
            t.Start();
        }
    }
}
