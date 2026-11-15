/* 공통 스크립트: 모바일 햄버거 메뉴 + 데이터 기반 렌더링(홈/작품 상세) + 이메일 복사
   모든 텍스트는 textContent로만 넣어서 데이터에 HTML이 섞여도 실행되지 않습니다. */
(function () {
  "use strict";

  var data = window.SITE_DATA || { site: {}, about: {}, works: [] };

  /* ---------- 작은 도우미 ---------- */
  function $(selector, root) { return (root || document).querySelector(selector); }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function workHref(work) { return "work.html?id=" + encodeURIComponent(work.id); }

  /* ---------- 모바일 햄버거 메뉴 ---------- */
  function initNav() {
    var toggle = $(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) { return; }

    var setOpen = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
    };

    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) { setOpen(false); }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 720) { setOpen(false); }
    });
  }

  /* 홈에서 스크롤 위치에 맞춰 메뉴 밑줄 이동 (지원하지 않는 브라우저에서는 건너뜀) */
  function initScrollSpy() {
    if (!("IntersectionObserver" in window)) { return; }
    var links = document.querySelectorAll('.site-nav a[href^="#"]');
    if (!links.length) { return; }
    var byId = {};
    Array.prototype.forEach.call(links, function (link) { byId[link.getAttribute("href").slice(1)] = link; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        Array.prototype.forEach.call(links, function (link) { link.classList.remove("is-current"); });
        var current = byId[entry.target.id];
        if (current) { current.classList.add("is-current"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) { observer.observe(section); }
    });
  }

  /* ---------- 영상 주소 → 안전한 임베드 주소 (유튜브/비메오 https만 허용) ---------- */
  function toEmbedUrl(raw) {
    if (!raw) { return null; }
    var url;
    try { url = new URL(raw); } catch (error) { return null; }
    if (url.protocol !== "https:") { return null; }

    var host = url.hostname.replace(/^www\./, "");
    var id = null;
    var idPattern = /^[A-Za-z0-9_-]{6,20}$/;

    if (host === "youtube.com" || host === "m.youtube.com") {
      var parts = url.pathname.split("/");
      if (url.pathname === "/watch") { id = url.searchParams.get("v"); }
      else if (parts[1] === "shorts" || parts[1] === "embed") { id = parts[2]; }
    } else if (host === "youtu.be") {
      id = url.pathname.split("/")[1];
    }
    if (id && idPattern.test(id)) {
      return "https://www.youtube-nocookie.com/embed/" + id;
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      var segments = url.pathname.split("/").filter(Boolean);
      var at = -1;
      for (var i = 0; i < segments.length; i++) {
        if (/^\d{5,}$/.test(segments[i])) { at = i; break; }
      }
      var videoId = at >= 0 ? segments[at] : null;
      // 비공개(unlisted) 영상: ?h=해시 또는 /영상ID/해시 형태를 지원
      var hash = url.searchParams.get("h");
      if (!hash && at >= 0 && host === "vimeo.com") { hash = segments[at + 1] || null; }
      if (hash && !/^[A-Za-z0-9]{6,20}$/.test(hash)) { hash = null; }
      if (videoId) { return "https://player.vimeo.com/video/" + videoId + (hash ? "?h=" + hash : ""); }
    }
    return null;
  }

  /* ---------- 공통 조각 ---------- */
  function fieldList(fields) {
    var list = make("dl", "fields");
    (fields || []).forEach(function (pair) {
      var row = make("div", "field-row");
      row.appendChild(make("dt", "", pair[0]));
      row.appendChild(make("dd", "", pair[1]));
      list.appendChild(row);
    });
    return list;
  }

  function videoBlock(video, work, posterIndex) {
    var block = make("div", "video-block");
    if (video && video.label) { block.appendChild(make("p", "video-label", video.label)); }

    var frame = make("div", "video-frame");
    frame.setAttribute("role", "region");
    frame.setAttribute("aria-label", (video && video.label ? video.label + " " : "") + "영상");

    var embed = toEmbedUrl(video && video.url);
    if (embed) {
      var iframe = make("iframe");
      iframe.src = embed;
      iframe.title = work.title + " " + ((video && video.label) || "영상");
      iframe.loading = "lazy";
      iframe.allowFullscreen = true;
      iframe.setAttribute("allow", "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen");
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      frame.appendChild(iframe);
    } else {
      var poster = (work.thumbs || [])[posterIndex] || (work.thumbs || [])[0];
      if (poster && poster.src) {
        var img = make("img", "video-poster");
        img.src = poster.src;
        img.alt = "";
        img.loading = "lazy";
        frame.appendChild(img);
      }
      frame.appendChild(make("span", "video-pending", "영상 준비 중"));
    }
    block.appendChild(frame);
    // 삽입 재생이 막히는 환경(파일로 직접 열기, 일부 앱 내 브라우저)에서도 볼 수 있도록 원본 링크를 함께 둔다.
    // toEmbedUrl 을 통과한 https 유튜브/비메오 주소만 링크로 만든다.
    if (embed) {
      var host = new URL(video.url).hostname.replace(/^www\./, "");
      var site = /vimeo\.com$/.test(host) ? "Vimeo" : "YouTube";
      var open = make("a", "video-open", site + "에서 보기 ↗");
      open.href = video.url;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      block.appendChild(open);
    }
    return block;
  }

  /* ---------- 홈: WORKS (정지 이미지 타일, 호버하면 천천히 움직이는 효과는 CSS) ---------- */
  function buildTile(work, thumb, options) {
    var cell = make("article", "tile");
    var media = make("a", "tile-media");
    media.href = workHref(work);
    media.setAttribute("aria-label", work.title + " — " + (thumb.tag || "영상"));

    var img = make("img", "tile-poster");
    img.src = thumb.src;
    img.alt = thumb.alt || "";
    img.loading = "lazy";
    media.appendChild(img);

    cell.appendChild(media);

    var meta = make("div", "tile-meta");
    if (options && options.numbered) {
      var title = make("h3", "tile-title");
      title.appendChild(make("span", "no", work.no));
      var bar = make("span", "bar");
      bar.setAttribute("aria-hidden", "true");
      title.appendChild(bar);
      var titleLink = make("a", "", work.title);
      titleLink.href = workHref(work);
      title.appendChild(titleLink);
      meta.appendChild(title);
    }
    var row = make("div", "tile-row");
    if (thumb.tag) { row.appendChild(make("p", "tile-tag", thumb.tag)); }
    meta.appendChild(row);
    if (options && options.numbered && work.short) { meta.appendChild(make("p", "tile-short", work.short)); }
    if (thumb.slate) { meta.appendChild(make("p", "tile-slate", thumb.slate)); }
    cell.appendChild(meta);
    return cell;
  }

  function renderWorks() {
    var featuredBox = $("#works-featured");
    var grid = $("#works-grid");
    if (!featuredBox || !grid) { return; }
    featuredBox.textContent = "";
    grid.textContent = "";

    data.works.forEach(function (work) {
      if (work.featured) {
        var card = make("article", "featured");
        var info = make("div", "featured-info");
        info.appendChild(make("p", "label", "FEATURED"));
        var title = make("h3", "featured-title");
        var titleLink = make("a", "", work.title);
        titleLink.href = workHref(work);
        title.appendChild(titleLink);
        info.appendChild(title);
        if (work.subtitle) { info.appendChild(make("p", "featured-sub", work.subtitle)); }
        info.appendChild(make("p", "featured-short", work.short));
        var more = make("a", "link-arrow", "VIEW PROJECT ");
        more.href = workHref(work);
        more.appendChild(make("span", "", "→"));
        more.lastChild.setAttribute("aria-hidden", "true");
        info.appendChild(more);

        var thumbs = make("div", "featured-thumbs");
        (work.thumbs || []).forEach(function (thumb) {
          thumbs.appendChild(buildTile(work, thumb, {}));
        });

        card.appendChild(info);
        card.appendChild(thumbs);
        featuredBox.appendChild(card);
      } else {
        var item = make("li");
        var first = (work.thumbs || [])[0] || {};
        var merged = {
          src: first.src, alt: first.alt, slate: first.slate,
          tag: first.tag || work.tag
        };
        item.appendChild(buildTile(work, merged, { numbered: true }));
        grid.appendChild(item);
      }
    });
  }

  /* 스크롤 등장: 요소가 화면에 들어오면 아래에서 올라오며 나타난다(움직임 줄이기 설정이면 건너뜀) */
  function initReveal() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) { return; }
    var targets = document.querySelectorAll(".section-head, .featured, .tile, .about-top, .strength, .tools, .contact-email, .contact-actions");
    if (!targets.length) { return; }
    document.documentElement.classList.add("reveal-on");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    Array.prototype.forEach.call(targets, function (node, index) {
      node.setAttribute("data-reveal", "");
      node.style.transitionDelay = ((index % 3) * 80) + "ms";
      observer.observe(node);
    });
    /* 안전장치: 관찰이 늦어져도 3.5초 뒤에는 모두 보이게 한다 */
    window.setTimeout(function () {
      Array.prototype.forEach.call(targets, function (node) { node.classList.add("is-in"); });
    }, 3500);
  }

  /* ---------- 홈: ABOUT ---------- */
  function renderAbout() {
    var box = $("#about-body");
    var about = data.about || {};
    var nameNode = $("#about-name");
    if (nameNode) { nameNode.textContent = [about.name, about.role].filter(Boolean).join(" · "); }
    if (!box) { return; }
    box.textContent = "";

    var top = make("div", "about-top");
    var lead = make("div", "about-lead");
    (about.headline || []).forEach(function (line, index) {
      lead.appendChild(make("p", index === 0 ? "about-line1" : "about-line2", line));
    });
    top.appendChild(lead);

    var career = make("div", "about-career");
    career.appendChild(make("h3", "mini-title", "CAREER"));
    var list = make("ul", "career-list");
    (about.career || []).forEach(function (row) {
      var li = make("li");
      li.appendChild(make("span", "yr", row.year));
      li.appendChild(make("span", "tx", row.text));
      list.appendChild(li);
    });
    career.appendChild(list);
    top.appendChild(career);
    box.appendChild(top);

    var strengths = make("ul", "strengths");
    (about.strengths || []).forEach(function (item, index) {
      var li = make("li", "strength");
      li.appendChild(make("span", "strength-no", String(index + 1).padStart(2, "0")));
      li.appendChild(make("h3", "strength-title", item.title));
      li.appendChild(make("p", "strength-proof", item.proof));
      strengths.appendChild(li);
    });
    box.appendChild(strengths);

    var tools = make("div", "tools");
    tools.appendChild(make("h3", "mini-title", "TOOLS"));
    (about.toolGroups || []).forEach(function (group) {
      var row = make("div", "tool-group");
      row.appendChild(make("p", "tool-label", group.label));
      var tags = make("ul", "tag-list");
      (group.items || []).forEach(function (name) { tags.appendChild(make("li", "", name)); });
      row.appendChild(tags);
      tools.appendChild(row);
    });
    box.appendChild(tools);
  }

  /* ---------- 홈: CONTACT (이메일 복사 · 메일 보내기) ---------- */
  function copyText(text, onDone) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { onDone(true); }, function () { onDone(false); });
      return;
    }
    try {
      var area = make("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(area);
      onDone(ok);
    } catch (error) { onDone(false); }
  }

  function renderContact() {
    var box = $("#contact-body");
    if (!box) { return; }
    box.textContent = "";
    var email = (data.site && data.site.email) || "";
    var valid = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email);

    box.appendChild(make("p", "contact-label", "E-MAIL"));
    if (!valid) {
      box.appendChild(make("p", "link-pending", "연락처 준비 중"));
      return;
    }
    box.appendChild(make("p", "contact-email", email));

    var actions = make("div", "contact-actions");
    var copy = make("button", "button", "이메일 복사");
    copy.type = "button";
    var status = make("p", "copy-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    copy.addEventListener("click", function () {
      copyText(email, function (ok) {
        status.textContent = ok ? "복사됨" : "복사 실패 — 주소를 직접 선택해 주세요";
      });
    });
    var mail = make("a", "button button-ghost", "메일 보내기");
    mail.href = "mailto:" + encodeURI(email);
    actions.appendChild(copy);
    actions.appendChild(mail);
    box.appendChild(actions);
    box.appendChild(status);
  }

  /* ---------- 작품 상세 ---------- */
  function renderDetail() {
    var article = $("#work-detail");
    if (!article) { return; }

    var id = new URLSearchParams(window.location.search).get("id");
    var work = data.works.filter(function (entry) { return entry.id === id; })[0];
    var missing = $("#work-missing");
    var back = $(".detail-back");
    var siteName = (data.site && data.site.name) || "LEE JUNHEE";

    if (!work) {
      article.hidden = true;
      if (missing) { missing.hidden = false; }
      document.title = "작품을 찾을 수 없음 | " + siteName;
      return;
    }
    if (back) { back.hidden = false; }

    var fullTitle = work.detailTitle || work.title;
    document.title = fullTitle + " | " + siteName;
    var noNode = $("#wd-no");
    if (noNode) { noNode.textContent = (work.no || "") + (work.tag ? "  |  " + work.tag : (work.subtitle ? "  |  " + work.subtitle : "")); }
    var titleNode = $("#wd-title");
    if (titleNode) { titleNode.textContent = fullTitle; }

    var parts = $("#wd-parts");
    if (parts) {
      parts.textContent = "";
      (work.parts || []).forEach(function (part, index) {
        var section = make("section", "detail-part");
        if (part.heading) { section.appendChild(make("h2", "part-title", part.heading)); }
        if (part.video) { section.appendChild(videoBlock(part.video, work, index)); }
        section.appendChild(fieldList(part.fields));
        parts.appendChild(section);
      });
    }

    var compare = $("#wd-compare");
    if (compare && work.compare) {
      compare.textContent = "";
      compare.appendChild(make("h2", "part-title", work.compare.heading));
      compare.appendChild(fieldList(work.compare.fields));
      compare.hidden = false;
    }

    var docs = $("#wd-docs");
    var safeDocs = (work.docs || []).filter(function (doc) {
      return doc && /^(assets\/docs\/[A-Za-z0-9_.\-]+\.pdf|https:\/\/)/.test(doc.href || "");
    });
    if (docs && safeDocs.length) {
      docs.textContent = "";
      docs.appendChild(make("h2", "part-title", "제작 문서"));
      var list = make("ul", "doc-list");
      safeDocs.forEach(function (doc) {
        var li = make("li");
        var link = make("a", "doc-link", doc.label + " (PDF)");
        link.href = doc.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        li.appendChild(link);
        list.appendChild(li);
      });
      docs.appendChild(list);
      docs.hidden = false;
    }
  }

  /* 헤더 눈금자: 스크롤 진행도를 재생헤드 위치(--p)와 타임코드(30fps, 4px=1프레임)로 표시 */
  function initPlayhead() {
    var ruler = $(".ruler");
    if (!ruler) { return; }
    var tc = $(".ruler-tc", ruler);
    var ticking = false;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var y = Math.max(0, window.pageYOffset || 0);
      var p = max > 0 ? Math.min(1, y / max) : 0;
      ruler.style.setProperty("--p", p.toFixed(4));
      if (tc) {
        var frames = Math.round(y / 4);
        tc.textContent = pad(Math.floor(frames / 108000)) + ":" + pad(Math.floor(frames / 1800) % 60) + ":" + pad(Math.floor(frames / 30) % 60) + ":" + pad(frames % 30);
      }
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* 히어로 하이라이트 릴: 실제 영상(무음 루프) + 재생/일시정지, 진행 바 이동, 챕터 칩(data-start 초) */
  function initReel() {
    var reel = $("#reel");
    var video = $("#reel-video");
    if (!reel || !video) { return; }
    var chips = reel.querySelectorAll(".chip");
    var tag = $(".reel-tag", reel);
    var fill = $("#reel-fill");
    var tc = $("#reel-tc");
    var toggle = $("#reel-toggle");
    var seek = $("#reel-seek");
    if (!fill || !tc || !toggle) { return; }

    var FPS = 30;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var userPaused = reduce;      // 움직임 줄이기 설정이면 자동 재생하지 않음
    var inView = true;
    var chapter = -1;
    var frameId = 0;

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function fmt(sec) {
      var s = Math.max(0, sec || 0);
      return "00:" + pad(Math.floor(s / 60) % 60) + ":" + pad(Math.floor(s) % 60) + ":" + pad(Math.floor((s % 1) * FPS));
    }
    function chapterAt(t) {
      var found = 0;
      Array.prototype.forEach.call(chips, function (chip, i) {
        if (t >= Number(chip.getAttribute("data-start")) - 0.05) { found = i; }
      });
      return found;
    }
    function render() {
      var d = video.duration || 0;
      var t = video.currentTime || 0;
      fill.style.width = (d ? Math.min(100, t / d * 100) : 0).toFixed(2) + "%";
      tc.textContent = fmt(t) + " / " + fmt(d);
      var index = chapterAt(t);
      if (index !== chapter) {
        chapter = index;
        Array.prototype.forEach.call(chips, function (chip, i) {
          chip.classList.toggle("is-on", i === index);
          chip.setAttribute("aria-pressed", String(i === index));
        });
        if (tag && chips[index]) { tag.textContent = "CH " + pad(index + 1) + " · " + chips[index].getAttribute("data-label"); }
      }
    }
    function loop() {
      render();
      if (!video.paused) { frameId = window.requestAnimationFrame(loop); }
    }
    function syncButton() {
      var playing = !video.paused;
      toggle.textContent = playing ? "❚❚" : "▶";
      toggle.setAttribute("aria-label", playing ? "일시정지" : "재생");
    }
    function play() {
      var promise = video.play();
      if (promise && promise.catch) { promise.catch(function () { syncButton(); }); }
    }

    video.addEventListener("play", function () { syncButton(); window.cancelAnimationFrame(frameId); loop(); });
    video.addEventListener("pause", function () { syncButton(); render(); });
    video.addEventListener("loadedmetadata", render);
    video.addEventListener("seeked", render);
    video.addEventListener("error", function () { reel.classList.add("is-static"); });

    toggle.addEventListener("click", function () {
      if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
    });
    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener("click", function () {
        video.currentTime = Number(chip.getAttribute("data-start")) || 0;
        render();
        if (!userPaused && video.paused) { play(); }
      });
    });
    if (seek) {
      seek.addEventListener("click", function (event) {
        var box = seek.getBoundingClientRect();
        var ratio = Math.min(0.999, Math.max(0, (event.clientX - box.left) / box.width));
        if (video.duration) { video.currentTime = ratio * video.duration; render(); }
      });
    }
    // 화면 밖에서는 멈춰서 리소스를 아낀다(사용자가 직접 멈춘 경우는 그대로 유지)
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView && !userPaused && video.paused) { play(); }
        if (!inView && !video.paused) { video.pause(); }
      }, { threshold: 0.25 }).observe(reel);
    }

    render();
    syncButton();
    if (!userPaused) { play(); }
  }

  initNav();
  initReel();
  initPlayhead();
  if ($("#works-grid")) { initScrollSpy(); }
  renderWorks();
  renderAbout();
  renderContact();
  renderDetail();
  initReveal();
})();
