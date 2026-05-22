using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

class MakeIcon
{
    static void Main()
    {
        string pngPath = "logo.png";
        string icoPath = "temp_icon.ico";
        if (!File.Exists(pngPath)) return;

        try
        {
            using (Bitmap bmp = new Bitmap(pngPath))
            {
                using (Bitmap iconBmp = new Bitmap(256, 256))
                {
                    using (Graphics g = Graphics.FromImage(iconBmp))
                    {
                        g.Clear(Color.Transparent);
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.SmoothingMode = SmoothingMode.HighQuality;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.CompositingQuality = CompositingQuality.HighQuality;
                        g.DrawImage(bmp, 0, 0, 256, 256);
                    }

                    using (MemoryStream pngMs = new MemoryStream())
                    {
                        iconBmp.Save(pngMs, ImageFormat.Png);
                        byte[] pngBytes = pngMs.ToArray();

                        using (FileStream fs = new FileStream(icoPath, FileMode.Create))
                        {
                            using (BinaryWriter bw = new BinaryWriter(fs))
                            {
                                bw.Write((short)0); // Reserved
                                bw.Write((short)1); // Type: Icon
                                bw.Write((short)1); // Count: 1

                                bw.Write((byte)0);   // Width
                                bw.Write((byte)0);   // Height
                                bw.Write((byte)0);   // Palette
                                bw.Write((byte)0);   // Reserved
                                bw.Write((short)1);  // Planes
                                bw.Write((short)32); // BPP
                                bw.Write((int)pngBytes.Length); // Size
                                bw.Write((int)22);   // Offset

                                bw.Write(pngBytes);
                            }
                        }
                    }
                }
            }
        }
        catch {}
    }
}
