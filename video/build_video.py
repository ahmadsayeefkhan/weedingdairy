"""Builds the Wedding Diary explainer video from app screenshots + a voice-over.

Everything runs locally except the voice: edge-tts (free Microsoft neural voices, no account or credits).
If edge-tts is unavailable it falls back to the offline Windows voice (System.Speech).

Run from the project root:  python video/build_video.py
Output: video/Wedding-Diary-App-Tour.mp4 (+ .srt subtitles)
"""
import asyncio, os, re, subprocess, sys, wave, shutil
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "docs", "shots")
WORK = os.path.join(ROOT, "video", "build")
OUT = os.path.join(ROOT, "video", "Wedding-Diary-App-Tour.mp4")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
W, H, FPS = 1920, 1080, 30

VOICE_EN = "en-IN-NeerjaNeural"   # South Asian English, warm female voice
VOICE_BN = "bn-BD-NabanitaNeural"  # Bangladeshi Bangla

CORAL, CORAL_INK, BLUSH, INK, MUTED = (217, 117, 102), (169, 73, 59), (251, 243, 240), (43, 37, 48), (110, 101, 112)
F = "C:/Windows/Fonts/"
def font(name, size): return ImageFont.truetype(F + name, size)

# (id, layout, image(s), eyebrow, title, subtitle, narration, [bangla_line])
SCENES = [
    ("intro", "title", ["splash.png"], "", "Wedding Diary", "Bangladesh's AI-powered wedding planner",
     "Welcome to Wedding Diary, the wedding operating system for Bangladeshi couples, their families, planners and vendors. "
     "Let's take a quick tour.", "ওয়েডিং ডায়েরিতে আপনাকে স্বাগতম।"),
    ("setup", "wide", ["setup.png"], "Getting started", "Tell us about your big day", "Profile setup",
     "Getting started takes a minute. Enter the bride and groom's names and the wedding date, shown in the Bangla calendar too. "
     "Pick your events, Holud, Mehendi, Wedding and Reception, and set a budget. Wedding Diary builds your plan from there."),
    ("dashboard", "wide", ["couple-dashboard.png"], "Plan", "Your wedding command centre", "Dashboard",
     "The dashboard is your command centre. A countdown to the big day, your planning progress, and a coloured ribbon for each event. "
     "Budget, guests, vendors and tasks are one tap away, and anything that needs attention, like a payment due or pending R S V Ps, is right at the top."),
    ("events", "wide", ["couple-event.png"], "Plan", "Orchestrate every moment", "Event timelines",
     "Every event gets its own hour by hour timeline, from the bridal makeup to the Bidaai. "
     "Change a time, and the whole family team is notified instantly."),
    ("checklist", "wide", ["couple-checklist.png"], "Plan", "A checklist that knows Bangladeshi weddings", "Smart checklist",
     "The smart checklist is generated for you, with culturally relevant tasks like tasting the kacchi, booking the Kazi, and preparing the Holud dala. "
     "Due dates count back from your wedding day."),
    ("budget", "wide", ["couple-budget.png"], "Money", "Financial clarity", "Budget analytics",
     "Budget analytics shows every taka against your plan, category by category, in lakh. "
     "It warns you when a category runs over, and suggests where to move money."),
    ("payments", "wide", ["couple-payments.png"], "Money", "Never miss a vendor deadline", "Payment scheduler",
     "When a vendor accepts your booking, a payment schedule appears automatically: booking, advance and final settlement. "
     "Pay with b Kash, Nagad, card or cash, and your budget updates itself."),
    ("guests", "wide", ["couple-guests.png"], "People", "Both families, one guest list", "Guests and R S V P",
     "Manage guests from the bride's side and the groom's side, with relations, events, seats and dietary needs. "
     "Send every pending invitation in one tap, and export the list for the caterer."),
    ("rsvp", "phone", ["guest-rsvp.png"], "People", "RSVP in seconds", "No app needed for guests",
     "Guests don't need an app. They open their personal link, accept or decline, choose seats and dietary needs, and the couple sees it instantly."),
    ("seating", "wide", ["couple-seating.png"], "People", "Everyone in the right seat", "Seating planner",
     "The seating planner seats confirmed guests by table. Auto assign keeps each family together and never goes over a table's capacity."),
    ("invitation", "wide", ["couple-invitation.png"], "People", "Elegant e-invites", "Digital invitations",
     "Design a digital invitation for the Holud, the wedding or the reception, in Bangla, English, or both, and share it with a Q R code."),
    ("marketplace", "wide", ["couple-marketplace.png"], "Vendors", "Curated excellence", "Vendor marketplace",
     "The vendor marketplace brings verified photographers, venues, caterers, decorators and more. "
     "An A I match score ranks vendors by your remaining budget, your city, real ratings, and availability on your date."),
    ("vendor", "wide", ["couple-vendor.png"], "Vendors", "Zero panic policy", "Vendor profiles and backups",
     "Every profile shows packages and verified reviews from couples who actually booked. "
     "If a vendor is already taken on your date, Wedding Diary instantly suggests backup vendors at a similar price."),
    ("assistant", "wide", ["couple-assistant.png"], "WeddingOS A.I.", "Your 24/7 planning partner", "AI wedding assistant",
     "Ask the A I wedding assistant anything, in English, Bangla, or Banglish. "
     "It answers from your own wedding data, and it never shares guests' phone numbers."),
    ("team", "wide", ["couple-team.png"], "Together", "Plan together, with the right access", "Family and team",
     "Invite parents, siblings and your planner. The couple controls everything, the planner can edit but can't see money, and family members can view."),
    ("live", "wide", ["live-mode.png"], "Wedding day", "Real-time coordination", "Live Mode",
     "On the wedding day, switch to Live Mode. See what's happening now and what's next, shift the schedule if you're running late, "
     "check guests in, track vendor readiness, and send a broadcast or an S O S to the whole team."),
    ("share", "phone", ["guest-share.png"], "Wedding day", "Every guest is a photographer", "Live photo sharing",
     "Guests scan a Q R code to share their photos, with no login. The couple approves them first."),
    ("tv", "wide", ["live-tv.png"], "Wedding day", "Your photos on the big screen", "TV slideshow",
     "Approved photos play live on the venue's big screen, with the Q R code in the corner inviting more guests to join in."),
    ("vault", "wide", ["live-vault.png"], "Memories", "Preserve every precious moment", "Memory Vault",
     "After the celebrations, the Memory Vault keeps every photo, organised by event, with favourites and full resolution downloads."),
    ("vendoros", "wide", ["vendor-dashboard.png"], "For vendors", "Bookings, revenue and reputation", "VendorOS",
     "Vendors get VendorOS: accept booking requests, track revenue and payouts, manage packages and availability, and update their status on the wedding day."),
    ("admin", "wide", ["admin-overview.png"], "For the Wedding Diary team", "Platform health at a glance", "Admin console",
     "And the Wedding Diary team gets an admin console to approve vendors, moderate reviews, and review every A I question and message."),
    ("outro", "phone", ["mobile-dashboard.png"], "", "Wedding Diary", "Powered by WeddingOS.ai",
     "Mobile first, bilingual, and built for Bangladeshi weddings. Wedding Diary. Redefining wedding experiences, digitally."),
]


# ---------- frames ----------
def background():
    bg = Image.new("RGB", (W, H), BLUSH)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse([W - 620, -420, W + 380, 520], fill=(255, 139, 122, 60))
    d.ellipse([-420, H - 420, 460, H + 420], fill=(217, 117, 102, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    return Image.alpha_composite(bg.convert("RGBA"), glow)


def rounded(img, r):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], r, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img.convert("RGBA"), (0, 0), mask)
    return out


def shadowed(canvas, img, xy, r=22, blur=28, alpha=70):
    x, y = xy
    sh = Image.new("RGBA", (img.size[0] + 160, img.size[1] + 160), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([80, 95, 80 + img.size[0], 95 + img.size[1]], r, fill=(120, 50, 40, alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(sh, (x - 80, y - 80))
    canvas.alpha_composite(rounded(img, r), (x, y))


def brand(d, x=80, y=56):
    d.text((x, y), "Wedding Diary", font=font("seguisb.ttf", 30), fill=INK)
    d.text((x + 2, y + 40), "B A N G L A D E S H", font=font("segoeui.ttf", 15), fill=CORAL_INK)


def heading(d, eyebrow, title, sub, x, y, max_w):
    if eyebrow:
        d.text((x + 22, y), eyebrow.upper(), font=font("seguisb.ttf", 18), fill=CORAL_INK, spacing=4)
        y += 34
    tf = font("segoeuil.ttf", 50)
    lines = wrap(d, title, tf, max_w)
    top = y
    for ln in lines:
        d.text((x + 22, y), ln, font=tf, fill=CORAL_INK)
        y += 60
    if sub:
        d.text((x + 24, y + 4), sub, font=font("segoeuii.ttf", 24), fill=MUTED)
        y += 40
    d.rounded_rectangle([x, top + 8, x + 6, y - 6], 3, fill=CORAL)
    return y


def wrap(d, text, f, max_w):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if d.textlength(t, font=f) <= max_w: cur = t
        else: lines.append(cur); cur = w_
    if cur: lines.append(cur)
    return lines


def frame_wide(s):
    _, _, imgs, eyebrow, title, sub, *_ = s
    c = background(); d = ImageDraw.Draw(c)
    brand(d)
    shot = Image.open(os.path.join(SHOTS, imgs[0])).convert("RGB")
    # left column title, right column screenshot
    heading(d, eyebrow, title, sub, 80, 260, 420)
    tw = 1230
    th = int(shot.height * tw / shot.width)
    if th > 900: th = 900; tw = int(shot.width * th / shot.height)
    shot = shot.resize((tw, th), Image.LANCZOS)
    shadowed(c, shot, (W - tw - 110, (H - th) // 2))
    return c


def frame_phone(s):
    _, _, imgs, eyebrow, title, sub, *_ = s
    c = background(); d = ImageDraw.Draw(c)
    brand(d)
    shot = Image.open(os.path.join(SHOTS, imgs[0])).convert("RGB")
    ph = 900; pw = int(shot.width * ph / shot.height)
    shot = shot.resize((pw, ph), Image.LANCZOS)
    # phone bezel
    bez = Image.new("RGBA", (pw + 28, ph + 28), (0, 0, 0, 0))
    ImageDraw.Draw(bez).rounded_rectangle([0, 0, pw + 27, ph + 27], 52, fill=(34, 28, 36, 255))
    bez.alpha_composite(rounded(shot, 40), (14, 14))
    x = 1180
    shadowed(c, bez, (x, (H - ph - 28) // 2), r=52)
    heading(d, eyebrow, title, sub, 180, 380, 800)
    return c


def frame_title(s):
    _, _, imgs, _, title, sub, _, *bn = s
    c = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(c)
    for y in range(H):  # coral gradient like the splash screen
        t = y / H
        col = tuple(int(a * (1 - t) + b * t) for a, b in zip((255, 139, 122), (192, 90, 77)))
        d.line([(0, y), (W, y)], fill=col + (255,))
    ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse([W - 700, H - 600, W + 300, H + 400], outline=(255, 255, 255, 70), width=2)
    c.alpha_composite(ring)
    # open-book monogram
    cx, cy = W // 2, 300
    d.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], outline=(255, 255, 255, 200), width=3)
    book = [(cx, cy + 45), (cx - 22, cy + 28), (cx - 62, cy + 24), (cx - 62, cy - 30), (cx - 22, cy - 26), (cx, cy - 8), (cx + 22, cy - 26), (cx + 62, cy - 30), (cx + 62, cy + 24), (cx + 22, cy + 28), (cx, cy + 45)]
    d.line(book, fill="white", width=5, joint="curve")
    d.line([(cx, cy - 8), (cx, cy + 45)], fill="white", width=5)
    tf = font("segoeuil.ttf", 110)
    d.text((W // 2, 500), title, font=tf, fill="white", anchor="mm")
    d.text((W // 2, 600), "B A N G L A D E S H", font=font("segoeui.ttf", 28), fill=(255, 255, 255, 220), anchor="mm")
    d.text((W // 2, 680), sub, font=font("segoeuil.ttf", 38), fill="white", anchor="mm")
    if bn:  # Bangla needs proper shaping, which Pillow lacks here: render it with Chrome
        png = os.path.join(WORK, "bn_greeting.png")
        subprocess.run(["node", "scripts/bn-text.mjs", bn[0], png, "64", "#ffffff"], cwd=os.path.join(ROOT, "app"), check=True)
        t = Image.open(png).convert("RGBA")
        c.alpha_composite(t, ((W - t.width) // 2, 790 - t.height // 2))
    return c


def frame_outro(s):
    c = frame_phone(s)
    d = ImageDraw.Draw(c)
    d.text((180, 700), "weddingdiary.com.bd  ·  @weddingdiarybd", font=font("segoeui.ttf", 28), fill=CORAL_INK)
    return c


# ---------- voice ----------
async def tts_edge(text, voice, path):
    import edge_tts
    await edge_tts.Communicate(text, voice, rate="-4%").save(path)


def tts_windows(text, path_wav):
    ps = ("Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
          "$s.SelectVoice('Microsoft Zira Desktop'); $s.Rate = -1; "
          f"$s.SetOutputToWaveFile('{path_wav}'); $s.Speak([Console]::In.ReadToEnd()); $s.Dispose()")
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], input=text, text=True, check=True)


def to_wav(src, dst):
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", src, "-ar", "48000", "-ac", "2", dst], check=True)


def wav_seconds(p):
    with wave.open(p) as w:
        return w.getnframes() / w.getframerate()


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-1500:]); sys.exit(1)


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


def main():
    os.makedirs(WORK, exist_ok=True)
    use_edge = True
    segments, srt, clock = [], [], 0.0
    for i, s in enumerate(SCENES):
        sid, layout, _, _, _, _, narration, *bn = s
        png = os.path.join(WORK, f"{i:02}_{sid}.png")
        (frame_title if layout == "title" else frame_outro if sid == "outro" else frame_phone if layout == "phone" else frame_wide)(s).convert("RGB").save(png)

        # narration (optional Bangla line first)
        wav = os.path.join(WORK, f"{i:02}_{sid}.wav")
        parts = []
        for j, (text, voice) in enumerate(([(bn[0], VOICE_BN)] if bn else []) + [(narration, VOICE_EN)]):
            part = os.path.join(WORK, f"{i:02}_{sid}_{j}")
            if os.path.exists(part + ".wav"):  # reuse narration recorded on an earlier run
                parts.append(part + ".wav"); continue
            try:
                if not use_edge: raise RuntimeError("edge disabled")
                asyncio.run(tts_edge(text, voice, part + ".mp3"))
                to_wav(part + ".mp3", part + ".wav")
            except Exception as e:
                if use_edge: print("edge-tts unavailable, using the offline Windows voice:", str(e)[:120])
                use_edge = False
                if voice == VOICE_BN: continue  # the Windows voice can't speak Bangla; skip the greeting
                tts_windows(text, part + ".wav")
                to_wav(part + ".wav", part + "_48k.wav"); os.replace(part + "_48k.wav", part + ".wav")
            parts.append(part + ".wav")
        if len(parts) > 1:  # join with a short pause
            lst = os.path.join(WORK, f"{i:02}_parts.txt")
            silence = os.path.join(WORK, "gap.wav")
            if not os.path.exists(silence):
                run([FFMPEG, "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "0.45", silence])
            with open(lst, "w") as fh:
                for k, p in enumerate(parts):
                    if k: fh.write(f"file '{silence}'\n")
                    fh.write(f"file '{p}'\n")
            run([FFMPEG, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", wav])
        else:
            shutil.copy(parts[0], wav)

        lead, tail = 0.5, 0.8
        dur = wav_seconds(wav) + lead + tail
        frames = int(dur * FPS)
        seg = os.path.join(WORK, f"{i:02}_{sid}.mp4")
        # slow push-in (Ken Burns) on a 2x image to avoid zoompan jitter, fade in/out
        vf = (f"scale={W * 2}:{H * 2},zoompan=z='min(1+0.0002*on,1.025)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS},"
              f"fade=t=in:st=0:d=0.4:color=0xFBF3F0,fade=t=out:st={dur - 0.45:.2f}:d=0.45:color=0xFBF3F0,format=yuv420p")
        af = f"loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,adelay={int(lead * 1000)}|{int(lead * 1000)},apad,atrim=0:{dur:.2f},afade=t=out:st={dur - 0.3:.2f}:d=0.3"
        run([FFMPEG, "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS), "-i", png, "-i", wav,
             "-filter_complex", f"[0:v]{vf}[v];[1:a]{af}[a]", "-map", "[v]", "-map", "[a]", "-t", f"{dur:.2f}",
             "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", str(FPS), "-c:a", "aac", "-b:a", "160k", "-ar", "48000", seg])
        segments.append(seg)
        srt.append(f"{i + 1}\n{srt_time(clock + lead)} --> {srt_time(clock + dur - tail + 0.3)}\n{(bn[0] + ' ') if bn else ''}{narration.replace('A I', 'AI').replace('R S V P', 'RSVP').replace('Q R', 'QR').replace('S O S', 'SOS').replace('b Kash', 'bKash')}\n")
        clock += dur
        print(f"scene {i + 1:02}/{len(SCENES)} {sid:12} {dur:5.1f}s")

    lst = os.path.join(WORK, "segments.txt")
    with open(lst, "w") as fh:
        for s in segments: fh.write(f"file '{s}'\n")
    run([FFMPEG, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", OUT])
    with open(OUT.replace(".mp4", ".srt"), "w", encoding="utf-8") as fh: fh.write("\n".join(srt))
    print(f"\nDone: {OUT}  ({clock / 60:.1f} min, voice: {'Microsoft neural (edge-tts)' if use_edge else 'Windows offline'})")


if __name__ == "__main__":
    main()
