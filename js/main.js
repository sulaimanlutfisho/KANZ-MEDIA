/**
 * كنز ميديا | KANZ MEDIA - Modern Interactive JavaScript
 * Ultra-lightweight Vanilla JS (No jQuery, Zero Bloat, 100/100 Lighthouse)
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. Mobile Menu Drawer Management
  // =========================================================================
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileLinks = document.querySelectorAll('.mobile-nav-links .m-link');

  function openDrawer() {
    mobileDrawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    mobileDrawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', openDrawer);
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener('click', closeDrawer);
  }

  mobileLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // Close drawer if user clicks outside
  document.addEventListener('click', (e) => {
    if (mobileDrawer.classList.contains('open') && 
        !mobileDrawer.contains(e.target) && 
        !mobileMenuBtn.contains(e.target)) {
      closeDrawer();
    }
  });


  // =========================================================================
  // Mockup Interactive Paste Demo Button
  // =========================================================================
  const mockupPasteDemoBtn = document.getElementById('mockupPasteDemoBtn');
  if (mockupPasteDemoBtn) {
    mockupPasteDemoBtn.addEventListener('click', () => {
      mockupPasteDemoBtn.textContent = 'تم اللصق ✓';
      mockupPasteDemoBtn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
      setTimeout(() => {
        mockupPasteDemoBtn.textContent = 'لصق';
        mockupPasteDemoBtn.style.background = '';
      }, 1500);
    });
  }

  // =========================================================================
  // 2. 20 Authentic Islamic Reminders Rotator
  // =========================================================================
  const islamicReminders = [
    "﴿وَذَكِّرْ فَإِنَّ الذِّكْرَىٰ تَنفَعُ الْمُؤْمِنِينَ﴾ — اجعل ما تشاهده شاهداً لك لا عليك بما يرضي الله.",
    "اللهم اجعل ما حمّلته نافعاً لك في دينك ودنياك، وبارك لك في وقتك وعمرك.",
    "تذكّر مراقبة الله في خلواتك: ﴿مَا يَلْفِظُ مِن قَوْلٍ إِلَّا لَدَيْهِ رَقِيبٌ عَتِيدٌ﴾.",
    "نسأل الله أن يكون هذا المحتوى عوناً لك على الخير، وأن يجنبك ما يسخطه ويُغضبه.",
    "الحمد لله الذي بنعمته تتم الصالحات — طهّر سمعك وبصرك عمّا حرّم الله تنل رضاه.",
    "﴿إِنَّ السَّمْعَ وَالْبَصَرَ وَالْفُؤَادَ كُلُّ أُولَٰئِكَ كَانَ عَنْهُ مَسْئُولًا﴾ — احرص أن ترى ما يسرّك في ميزانك.",
    "اللهم ارزقنا علماً نافعاً وعملاً صالحاً متقبلاً، واعصمنا من فتن الشبهات والشهوات.",
    "أخي الكريم: اجعل ما تشاهده وتسمعه سبباً لرفعة درجاتك لا حسرة في صحيفتك.",
    "سبحان الله وبحمده، سبحان الله العظيم — بارك الله لك فيما رزقك وحفظك من كل سوء.",
    "تذكّر أن الأثر يبقى والأنفاس تُعد، فاجعل أثرك طيباً نافعاً يرضي الرحمن.",
    "﴿يَعْلَمُ خَائِنَةَ الْأَعْيُنِ وَمَا تُخْفِي الصُّدُورُ﴾ — دُم في معية الله وتقواه أينما كنت.",
    "اللهم اجعلنا ممن يستمعون القول فيتبعون أحسنه، وجنّبنا ما يُغضبك ويُبعدنا عن رحمتك.",
    "استثمر دقائق عمرك فيما ينفعك في آخرتك، فإن العمر قصير واللقاء قريب.",
    "لا إله إلا الله وحده لا شريك له — نسأل الله أن ينفعك بما علِمت وأن يجعله حجة لك.",
    "طوبى لمن وجد في صحيفته حسناتٍ وذكراً نافعاً — صُن بصرك ينوّر الله بصيرتك.",
    "اللهم اكفنا بحلالك عن حرامك، وبطاعتك عن معصيتك، وبفضلك عمن سواك.",
    "تذكّر نعمة البصر والسمع وأدِّ شكرها بتسخيرها في مباح يقرّبك إلى الجنة.",
    "﴿وَاتَّقُوا يَوْمًا تُرْجَعُونَ فِيهِ إِلَى اللَّهِ﴾ — نسأل الله لك التوفيق والسداد فيما تشاهد.",
    "اجعل ما حملته نافذة للخير والنفع والأجر، وتجنب كل ما يخالف الشرع الحنيف.",
    "صلِّ على الحبيب المصطفى ﷺ — اللهم اجعل هذا العمل خالصاً لوجهك الكريم ومباركاً لصاحبه."
  ];

  let currentReminderIndex = 0;
  const reminderQuoteEl = document.getElementById('reminderQuote');
  const reminderCounterEl = document.getElementById('reminderCounter');
  const nextReminderBtn = document.getElementById('nextReminderBtn');
  const reminderBox = document.getElementById('reminderBox');

  function updateReminder(index) {
    if (!reminderQuoteEl) return;
    
    // Smooth transition
    reminderBox.style.opacity = '0.4';
    reminderBox.style.transform = 'translateY(6px)';

    setTimeout(() => {
      currentReminderIndex = (index + islamicReminders.length) % islamicReminders.length;
      reminderQuoteEl.textContent = islamicReminders[currentReminderIndex];
      reminderCounterEl.textContent = `تذكير رقم ${currentReminderIndex + 1} من ${islamicReminders.length}`;
      reminderBox.style.opacity = '1';
      reminderBox.style.transform = 'translateY(0)';
    }, 180);
  }

  if (nextReminderBtn) {
    nextReminderBtn.addEventListener('click', () => {
      updateReminder(currentReminderIndex + 1);
    });
  }

  // Auto-rotate reminders gently every 12 seconds
  setInterval(() => {
    updateReminder(currentReminderIndex + 1);
  }, 12000);


  // =========================================================================
  // 3. Interactive Video Trimmer Calculator
  // =========================================================================
  const trimStart = document.getElementById('trimStart');
  const trimEnd = document.getElementById('trimEnd');
  const startValText = document.getElementById('startValText');
  const endValText = document.getElementById('endValText');
  const durationText = document.getElementById('durationText');
  const savedSizeText = document.getElementById('savedSizeText');
  const trimCurrentDisplay = document.getElementById('trimCurrentDisplay');

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function recalculateTrimmer() {
    if (!trimStart || !trimEnd) return;

    let start = parseInt(trimStart.value, 10);
    let end = parseInt(trimEnd.value, 10);

    // Keep start < end
    if (start >= end) {
      if (start < 89) {
        end = start + 5;
        trimEnd.value = end;
      } else {
        start = end - 5;
        trimStart.value = start;
      }
    }

    const duration = end - start;
    startValText.textContent = formatTime(start);
    endValText.textContent = formatTime(end);
    durationText.textContent = `${duration} ثانية`;
    trimCurrentDisplay.textContent = `${formatTime(start)} / ${formatTime(end)}`;

    // Estimated size (approx 1.5MB per 10 seconds of 1080p video)
    const estimatedMb = ((duration * 0.18)).toFixed(1);
    const fullVideoMb = 48.0;
    const savedPercent = Math.min(95, Math.max(10, Math.round((1 - (estimatedMb / fullVideoMb)) * 100)));

    savedSizeText.textContent = `~${estimatedMb} MB (وفرت ${savedPercent}%)`;
  }

  if (trimStart && trimEnd) {
    trimStart.addEventListener('input', recalculateTrimmer);
    trimEnd.addEventListener('input', recalculateTrimmer);
    recalculateTrimmer();
  }


  // =========================================================================
  // 4. Interactive Live Simulator (Platforms & Link Inspection)
  // =========================================================================
  const platformData = {
    instagram: {
      url: "https://www.instagram.com/reel/C8k9xLMtpA2/",
      title: "مقطع ريلز إنستغرام عالي الدقة | استخراج كامل مع الصوت النقي",
      duration: "00:54",
      res: "1080p FHD",
      size: "16.4 MB",
      time: "0.25 ثانية",
      thumb: "assets/icons/app_icon.png"
    },
    tiktok: {
      url: "https://www.tiktok.com/@creator/video/73829104928172",
      title: "فيديو تيك توك فائق الجودة بدون علامة مائية نهائياً",
      duration: "00:32",
      res: "1080p 60fps",
      size: "12.8 MB",
      time: "0.19 ثانية",
      thumb: "assets/icons/app_icon.png"
    },
    youtube: {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "محاضرة علمية هادفة | خيار التحميل 4K أو MP3 صوت نقي",
      duration: "14:20",
      res: "4K UHD / MP3",
      size: "185.0 MB",
      time: "0.38 ثانية",
      thumb: "assets/icons/app_icon.png"
    },
    whatsapp: {
      url: "حالات واتساب الرسمية (فحص الحالات المكتشفة تلقائياً)",
      title: "حالة واتساب فيديو | حفظ فوري ومباشر إلى ألبوم الكاميرا",
      duration: "00:30",
      res: "720p HD",
      size: "4.2 MB",
      time: "0.10 ثانية",
      thumb: "assets/icons/app_icon.png"
    }
  };

  const simTabs = document.querySelectorAll('.sim-tab');
  const simUrlInput = document.getElementById('simUrlInput');
  const simTitle = document.getElementById('simTitle');
  const simDuration = document.getElementById('simDuration');
  const simRes = document.getElementById('simRes');
  const simSize = document.getElementById('simSize');
  const simFill = document.getElementById('simFill');
  const simProgressStatus = document.getElementById('simProgressStatus');
  const simProgressPercent = document.getElementById('simProgressPercent');
  const simActionBtn = document.getElementById('simActionBtn');
  const simBtnText = document.getElementById('simBtnText');

  let activePlatform = 'instagram';

  function applySimPlatform(platformKey) {
    activePlatform = platformKey;
    const data = platformData[platformKey];
    if (!data) return;

    simUrlInput.value = data.url;
    simTitle.textContent = data.title;
    simDuration.textContent = data.duration;
    simRes.textContent = data.res;
    simSize.textContent = data.size;

    // Reset progress
    simFill.style.width = '100%';
    simProgressStatus.textContent = 'جاهز للتحميل الفوري';
    simProgressPercent.textContent = '100%';
  }

  simTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      simTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      applySimPlatform(tab.getAttribute('data-sim'));
    });
  });

  if (simActionBtn) {
    simActionBtn.addEventListener('click', () => {
      simBtnText.textContent = "جاري التحليل السريع...";
      simActionBtn.style.opacity = '0.7';
      simFill.style.width = '0%';
      simProgressStatus.textContent = "جاري الاتصال بالمحرك...";
      simProgressPercent.textContent = "0%";

      let currentP = 0;
      const interval = setInterval(() => {
        currentP += Math.floor(Math.random() * 25) + 15;
        if (currentP >= 100) {
          currentP = 100;
          clearInterval(interval);
          simFill.style.width = '100%';
          simProgressStatus.textContent = "اكتمل التحميل وحُفظ في VideoDownloader 🌿";
          simProgressPercent.textContent = "100%";
          simBtnText.textContent = "فحص الرابط وتنزيله ⚡";
          simActionBtn.style.opacity = '1';
        } else {
          simFill.style.width = `${currentP}%`;
          simProgressStatus.textContent = `جاري استخراج أعلى دقة (${currentP}%)...`;
          simProgressPercent.textContent = `${currentP}%`;
        }
      }, 120);
    });
  }


  // =========================================================================
  // 5. FAQ Accordion Interaction
  // =========================================================================
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isOpen = item.classList.contains('open');

      // Close all items
      document.querySelectorAll('.accordion-item').forEach(otherItem => {
        otherItem.classList.remove('open');
        const otherHeader = otherItem.querySelector('.accordion-header');
        if (otherHeader) otherHeader.setAttribute('aria-expanded', 'false');
      });

      // Toggle clicked item
      if (!isOpen) {
        item.classList.add('open');
        header.setAttribute('aria-expanded', 'true');
      }
    });
  });


  // =========================================================================
  // 6. Header Scroll Effect & Active Nav Link Tracking
  // =========================================================================
  const siteHeader = document.querySelector('.site-header');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      siteHeader.style.background = 'rgba(7, 10, 16, 0.92)';
      siteHeader.style.borderBottomColor = 'rgba(139, 92, 246, 0.2)';
    } else {
      siteHeader.style.background = 'rgba(7, 10, 16, 0.75)';
      siteHeader.style.borderBottomColor = 'rgba(255, 255, 255, 0.07)';
    }
  }, { passive: true });

});
