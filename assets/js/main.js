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
    return block;
  }

  /* ---------- 홈: WORKS (어두운 무대 + 호버 프리뷰) ---------- */
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

    /* 프리뷰 영상은 호버·화면 진입 때에만 내려받는다(data-src → src) */
    if (thumb.preview) {
      var video = make("video", "tile-video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "none";
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("aria-hidden", "true");
      video.tabIndex = -1;
      video.setAttribute("data-src", thumb.preview);
      media.appendChild(video);
    }
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
    var tc = make("p", "tile-tc", "00:00:00:00");
    tc.setAttribute("aria-hidden", "true");
    row.appendChild(tc);
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
          src: first.src, alt: first.alt, preview: first.preview, slate: first.slate,
          tag: first.tag || work.tag
        };
        item.appendChild(buildTile(work, merged, { numbered: true }));
        grid.appendChild(item);
      }
    });
  }

  /* 프리뷰 재생: 마우스를 올리면(터치 기기는 화면에 60% 들어오면) 4초 루프가 재생되고 타임코드가 올라간다 */
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function timecode(seconds) {
    var frames = Math.floor((seconds % 1) * 24);
    var s = Math.floor(seconds) % 60;
    var m = Math.floor(seconds / 60) % 60;
    var h = Math.floor(seconds / 3600);
    return pad2(h) + ":" + pad2(m) + ":" + pad2(s) + ":" + pad2(frames);
  }

  function initPreviews() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var saver = navigator.connection && navigator.connection.saveData;
    if (reduce || saver) { return; }
    var hoverable = window.matchMedia && window.matchMedia("(hover: hover)").matches;

    Array.prototype.forEach.call(document.querySelectorAll(".tile"), function (tileNode) {
      var media = $(".tile-media", tileNode);
      var video = $(".tile-video", tileNode);
      var tc = $(".tile-tc", tileNode);
      if (!media || !video) { return; }
      var raf = 0;

      function tick() {
        if (tc) { tc.textContent = timecode(video.currentTime); }
        raf = window.requestAnimationFrame(tick);
      }
      function start() {
        if (!video.getAttribute("src")) { video.src = video.getAttribute("data-src"); }
        var played = video.play();
        if (played && played.catch) { played.catch(function () {}); }
        tileNode.classList.add("is-playing");
        window.cancelAnimationFrame(raf);
        tick();
      }
      function stop() {
        video.pause();
        tileNode.classList.remove("is-playing");
        window.cancelAnimationFrame(raf);
      }

      if (hoverable) {
        media.addEventListener("mouseenter", start);
        media.addEventListener("mouseleave", stop);
        media.addEventListener("focus", start);
        media.addEventListener("blur", stop);
      } else if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) { if (entry.isIntersecting) { start(); } else { stop(); } });
        }, { threshold: 0.6 }).observe(tileNode);
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

  initNav();
  if ($("#works-grid")) { initScrollSpy(); }
  renderWorks();
  renderAbout();
  renderContact();
  renderDetail();
  initPreviews();
  initReveal();
})();
