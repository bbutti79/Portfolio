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

    var closeWorks = initWorksNav(nav);
    var setOpen = function (open) {
      if (!open) { closeWorks(); }
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
    /* 메뉴 밖을 누르면 닫는다(열린 메뉴가 화면을 가리지 않게) */
    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("is-open")) { return; }
      if (nav.contains(event.target) || toggle.contains(event.target)) { return; }
      setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (!event.defaultPrevented && event.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 720) { setOpen(false); }
    });
  }

  /* WORKS 링크는 목록 이동, 별도 버튼은 완성작 하위 목록을 펼친다. */
  function initWorksNav(nav) {
    var link = nav.querySelector('a[href$="#works"]');
    if (!link) { return function () {}; }
    var item = link.parentNode;
    item.classList.add("nav-works");
    var button = make("button", "works-toggle", "▾");
    button.type = "button";
    button.setAttribute("aria-label", "작품 목록 펼치기");
    button.setAttribute("aria-controls", "works-submenu");
    button.setAttribute("aria-expanded", "false");
    var list = make("ul", "works-submenu");
    list.id = "works-submenu"; list.hidden = true;
    var currentId = new URLSearchParams(location.search).get("id");
    (data.works || []).filter(function (work) { return !work.wip && work.id; }).forEach(function (work) {
      var li = make("li"); var a = make("a", "", work.title);
      a.href = workHref(work);
      if (currentId === work.id && document.getElementById("work-detail")) { a.setAttribute("aria-current", "page"); }
      li.appendChild(a); list.appendChild(li);
    });
    item.appendChild(button); item.appendChild(list);
    var timer;
    function setOpen(open) {
      clearTimeout(timer); list.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "작품 목록 접기" : "작품 목록 펼치기");
    }
    button.addEventListener("click", function () { setOpen(list.hidden); });
    item.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "mouse" && window.innerWidth >= 720) { setOpen(true); }
    });
    item.addEventListener("pointerleave", function (event) {
      if (event.pointerType === "mouse" && window.innerWidth >= 720) {
        timer = setTimeout(function () { if (!item.contains(document.activeElement)) { setOpen(false); } }, 180);
      }
    });
    item.addEventListener("focusout", function () {
      setTimeout(function () { if (!item.contains(document.activeElement)) { setOpen(false); } }, 0);
    });
    item.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !list.hidden) {
        event.preventDefault(); event.stopPropagation(); setOpen(false); button.focus();
      } else if (event.key === "ArrowDown" && (event.target === button || event.target === link)) {
        event.preventDefault(); setOpen(true); list.querySelector("a").focus();
      }
    });
    document.addEventListener("click", function (event) { if (!item.contains(event.target)) { setOpen(false); } });
    window.addEventListener("resize", function () { setOpen(false); });
    return function () { setOpen(false); };
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

    if (video && video.portrait) { frame.classList.add("video-frame-portrait"); }

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
  function slateRow(label, value) {
    var row = make("p", "slate-row");
    row.appendChild(make("span", "slate-label", label));
    row.appendChild(make("span", "slate-value", value));
    return row;
  }

  /* 영상 한 편을 카드로 표현하는 객체: {no, title, short, href, thumb} */
  function buildFilms() {
    var films = [];
    (data.works || []).forEach(function (work) {
      var parts = work.wip ? [{}] : (work.parts || []);
      parts.forEach(function (part, index) {
        if (!part || (!part.video && !work.wip)) { return; }
        var thumb = (work.thumbs || [])[index] || (work.thumbs || [])[0] || {};
        films.push({
          no: String(films.length + 1).padStart(2, "0"),
          title: part.cardTitle || work.title,
          short: part.cardShort || work.short,
          href: work.wip ? null : workHref(work) + (part.anchor ? "#" + part.anchor : ""),
          thumb: {
            src: thumb.src, alt: thumb.alt, ai: thumb.ai, tools: thumb.tools,
            tag: thumb.tag || work.tag
          }
        });
      });
    });
    return films;
  }

  function buildTile(film, options) {
    var thumb = film.thumb || {};
    var cell = make(options && options.numbered ? "article" : "div", "tile");
    var media = make(film.href ? "a" : "div", "tile-media");
    if (film.href) {
      media.href = film.href;
      media.setAttribute("aria-label", film.title + " — " + (thumb.tag || "영상"));
    }

    var img = make("img", "tile-poster");
    img.src = thumb.src;
    img.alt = thumb.alt || "";
    img.loading = "lazy";
    media.appendChild(img);

    cell.appendChild(media);

    var meta = make("div", "tile-meta");
    if (options && options.numbered) {
      var head = make("div", "tile-head");
      var title = make("h3", "tile-title");
      title.appendChild(make("span", "no", film.no));
      title.appendChild(document.createTextNode(" "));
      var bar = make("span", "bar");
      bar.setAttribute("aria-hidden", "true");
      title.appendChild(bar);
      var titleText = make(film.href ? "a" : "span", "", film.title);
      if (film.href) { titleText.href = film.href; }
      title.appendChild(titleText);
      head.appendChild(title);

      if (film.href) {
        /* 제목 링크와 같은 곳으로 가므로 보조기기에는 숨김 */
        var more = make("a", "tile-more", "VIEW PROJECT →");
        more.href = film.href;
        more.setAttribute("aria-hidden", "true");
        more.tabIndex = -1;
        head.appendChild(more);
      } else {
        var status = make("span", "tile-status");
        var label = make("span", "", "WORK IN PROGRESS");
        label.setAttribute("lang", "en");
        status.appendChild(label);
        status.appendChild(make("span", "sr-only", " — 제작 진행 중"));
        head.appendChild(status);
      }
      meta.appendChild(head);
    }
    var row = make("div", "tile-row");
    if (thumb.tag) { row.appendChild(make("p", "tile-tag", thumb.tag)); }
    meta.appendChild(row);
    if (options && options.numbered && film.short) { meta.appendChild(make("p", "tile-short", film.short)); }
    if (thumb.ai || thumb.tools) {
      var slate = make("div", "tile-slate");
      if (thumb.ai) { slate.appendChild(slateRow("AI", thumb.ai)); }
      if (thumb.tools) { slate.appendChild(slateRow("TOOLS", thumb.tools)); }
      meta.appendChild(slate);
    }
    cell.appendChild(meta);
    return cell;
  }

  /* WORKS: 01 대표작(전폭) → 02·03 → 04·05 → 06·07 (모바일은 한 열) */
  function renderWorks() {
    var featuredBox = $("#works-featured");
    var grid = $("#works-grid");
    if (!featuredBox || !grid) { return; }
    featuredBox.textContent = "";
    grid.textContent = "";

    buildFilms().forEach(function (film, index) {
      if (index === 0) {
        var card = make("article", "featured");
        var info = make("div", "featured-info");
        info.appendChild(make("p", "label", "FEATURED"));
        var title = make("h3", "featured-title");
        var titleLink = make("a", "", film.title);
        titleLink.href = film.href;
        title.appendChild(titleLink);
        info.appendChild(title);
        info.appendChild(make("p", "featured-short", film.short));
        var more = make("a", "link-arrow", "VIEW PROJECT ");
        more.href = film.href;
        more.appendChild(make("span", "", "→"));
        more.lastChild.setAttribute("aria-hidden", "true");
        info.appendChild(more);

        var media = make("div", "featured-media");
        media.appendChild(buildTile(film, {}));

        card.appendChild(info);
        card.appendChild(media);
        featuredBox.appendChild(card);
      } else {
        var item = make("li");
        item.appendChild(buildTile(film, { numbered: true }));
        grid.appendChild(item);
      }
    });
  }

  function initReveal() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) { return; }
    var targets = document.querySelectorAll(".section-head, .featured, .tile, .about-top, .about-cols, .strengths, .tools, .contact-email, .contact-actions");
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

    var layout = make("div", "about-layout");
    var fig = make("figure", "about-portrait");
    var img = make("img");
    img.src = "assets/img/about-portrait.jpg";
    img.alt = "작업 소개용 캐리커처 일러스트(AI로 제작): 왼쪽은 스토리보드 스케치, 오른쪽은 편집 작업실";
    img.width = 960; img.height = 1200; img.loading = "lazy";
    fig.appendChild(img);
    layout.appendChild(fig);
    var main = make("div", "about-main");
    var top = make("div", "about-top");
    var lead = make("div", "about-lead");
    (about.headline || []).forEach(function (line, index) {
      lead.appendChild(make("p", index === 0 ? "about-line1" : "about-line2", line));
    });
    top.appendChild(lead);
    main.appendChild(top);

    /* CAREER(왼쪽) · EDUCATION(오른쪽). 좁은 화면에서는 위아래로 쌓인다 */
    var cols = make("div", "about-cols");

    var career = make("div", "about-career");
    career.appendChild(make("h3", "mini-title", "CAREER"));
    var list = make("ul", "career-list");
    (about.career || []).forEach(function (row) {
      var li = make("li");
      li.appendChild(make("span", "yr", row.period));
      var text = make("span", "tx");
      text.appendChild(make("strong", "co", row.company));
      text.appendChild(make("span", "role", row.role));
      li.appendChild(text);
      list.appendChild(li);
    });
    career.appendChild(list);
    cols.appendChild(career);

    var edu = make("div", "about-edu");
    edu.appendChild(make("h3", "mini-title", "EDUCATION"));
    var eduList = make("ul", "career-list edu-list");
    (about.education || []).forEach(function (row) {
      var li = make("li");
      var text = make("span", "tx");
      text.appendChild(make("strong", "co", row.title));
      text.appendChild(make("span", "role", row.detail));
      if (row.status) { text.appendChild(make("span", "edu-status", row.status)); }
      li.appendChild(text);
      eduList.appendChild(li);
    });
    edu.appendChild(eduList);
    cols.appendChild(edu);
    main.appendChild(cols);

    layout.appendChild(main);
    box.appendChild(layout);

    /* 영상 제작에 이어지는 경험: 제목 + 설명을 한 묶음씩 3개 */
    if ((about.strengths || []).length) {
      var strengths = make("div", "strengths");
      strengths.appendChild(make("h3", "mini-title", about.strengthsTitle || "STRENGTHS"));
      var sList = make("ul", "strength-list");
      about.strengths.forEach(function (item, index) {
        var li = make("li", "strength");
        li.appendChild(make("span", "strength-no", String(index + 1).padStart(2, "0")));
        li.appendChild(make("h4", "strength-title", item.title));
        li.appendChild(make("p", "strength-text", item.text));
        sList.appendChild(li);
      });
      strengths.appendChild(sList);
      box.appendChild(strengths);
    }

    var tools = make("div", "tools");
    tools.appendChild(make("h3", "mini-title", "TOOLS"));
    var ABBR = {
      "Premiere Pro": "Pr", "After Effects": "Ae", "Photoshop": "Ps", "Illustrator": "Ai", "Cinema 4D": "C4",
      "Seedance": "Sd", "Runway": "Rw", "Google Flow": "Fl", "Higgsfield": "Hf", "Midjourney": "Mj",
      "Suno": "Su", "ChatGPT": "GP", "Claude": "Cl", "Antigravity": "Ag"
    };
    /* 로컬 SVG 로고. Adobe·Cinema 4D는 공식 배포 원본, 기타는 기존 자산 유지 */
    var LOGO = {
      "Premiere Pro": "adobepremierepro", "After Effects": "adobeaftereffects", "Photoshop": "adobephotoshop",
      "Illustrator": "adobeillustrator", "Cinema 4D": "cinema4d", "ChatGPT": "openai", "Claude": "claude"
    };
    /* 로컬 PNG 로고. Suno는 공식 사이트 아이콘. 로드 실패 시 약어로 대체 */
    var LOGO_PNG = {
      "Seedance": "seedance", "Runway": "runway", "Google Flow": "google-flow",
      "Higgsfield": "higgsfield", "Midjourney": "midjourney", "Antigravity": "antigravity", "Suno": "suno"
    };
    var split = make("div", "tools-split");
    var colTools = make("div", "tools-col");
    var colAi = make("div", "tools-col");
    (about.toolGroups || []).forEach(function (group, groupIndex) {
      var row = make("div", "tool-group");
      row.appendChild(make("p", "tool-label", group.label));
      var grid = make("ul", "tool-grid");
      (group.items || []).forEach(function (name) {
        var item = make("li", "tool-item tool-tone-" + (groupIndex % 3));
        var icon;
        if (LOGO[name] || LOGO_PNG[name]) {
          icon = make("span", "tool-icon tool-icon-logo");
          var logo = make("img");
          logo.src = "assets/img/tools/" + (LOGO[name] ? LOGO[name] + ".svg" : LOGO_PNG[name] + ".png");
          logo.onerror = function () {
            icon.className = "tool-icon";
            icon.textContent = ABBR[name] || name.slice(0, 2);
          };
          logo.alt = "";
          logo.width = 24;
          logo.height = 24;
          icon.appendChild(logo);
        } else {
          icon = make("span", "tool-icon", ABBR[name] || name.slice(0, 2));
        }
        icon.setAttribute("aria-hidden", "true");
        item.appendChild(icon);
        item.appendChild(make("span", "tool-name", name));
        grid.appendChild(item);
      });
      row.appendChild(grid);
      (group.label === "AI" ? colAi : colTools).appendChild(row);
    });
    split.appendChild(colTools);
    split.appendChild(colAi);
    tools.appendChild(split);
    box.appendChild(tools); /* TOOLS는 소개 아래 전폭, 2분할(왼쪽 영상·그래픽 툴 / 오른쪽 AI) */
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
  /* 제작 문서 목록: assets/docs 안의 PDF 또는 https 링크만 허용. 유효한 항목이 없으면 null */
  function docList(docs) {
    var safe = (docs || []).filter(function (doc) {
      return doc && /^(assets\/docs\/[A-Za-z0-9_.\-]+\.pdf|https:\/\/)/.test(doc.href || "");
    });
    if (!safe.length) { return null; }
    var list = make("ul", "doc-list");
    safe.forEach(function (doc) {
      var li = make("li");
      var link = make("a", "doc-link", doc.label + " (PDF)");
      link.href = doc.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      li.appendChild(link);
      list.appendChild(li);
    });
    return list;
  }

  /* ---------- 제작 자료 확대 보기 (기획서·스토리보드·편집 화면 등 읽어야 하는 이미지) ---------- */
  var zoom = null;   /* 대화상자는 처음 열 때 한 번만 만든다 */

  function zoomSupported() {
    return typeof window.HTMLDialogElement === "function" && typeof window.HTMLDialogElement.prototype.showModal === "function";
  }

  function zoomIcon() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var path = document.createElementNS(ns, "path");
    path.setAttribute("d", "M9 2h5v5M7 14H2V9M14 2L9.5 6.5M2 14l4.5-4.5");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    svg.appendChild(path);
    return svg;
  }

  function buildZoom() {
    var dialog = make("dialog", "zoom-dialog");
    dialog.setAttribute("aria-labelledby", "zoom-title");
    var panel = make("div", "zoom-panel");
    var bar = make("div", "zoom-bar");
    var heading = make("div", "zoom-heading");
    var title = make("p", "zoom-title");
    title.id = "zoom-title";
    var size = make("p", "zoom-size");
    heading.appendChild(title);
    heading.appendChild(size);
    var fit = make("button", "zoom-btn", "");
    fit.type = "button";
    var close = make("button", "zoom-btn zoom-close", "닫기");
    close.type = "button";
    bar.appendChild(heading);
    bar.appendChild(fit);
    bar.appendChild(close);
    var scroll = make("div", "zoom-scroll");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "확대한 이미지 (화살표 키로 스크롤)");
    var img = make("img", "zoom-img");
    img.alt = "";
    scroll.appendChild(img);
    panel.appendChild(bar);
    panel.appendChild(scroll);
    dialog.appendChild(panel);
    document.body.appendChild(dialog);

    /* Tab/Shift+Tab은 확대 창의 조작 요소 안에서 순환한다. */
    dialog.addEventListener("keydown", function (event) {
      if (event.key !== "Tab") { return; }
      var first = fit;
      var last = scroll;
      var active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    });
    var state = { dialog: dialog, title: title, size: size, fit: fit, img: img, scroll: scroll, opener: null, actual: false };

    function setActual(actual) {
      state.actual = actual;
      dialog.classList.toggle("is-actual", actual);
      fit.setAttribute("aria-pressed", String(actual));
      fit.textContent = actual ? "화면에 맞추기" : "원본 크기로 보기";
      scroll.scrollTop = 0;
      scroll.scrollLeft = 0;
    }
    state.setActual = setActual;
    fit.addEventListener("click", function () { setActual(!state.actual); });
    close.addEventListener("click", function () { dialog.close(); });

    /* 배경(어두운 영역)을 눌러야만 닫힌다. 내용 안에서 시작한 드래그가 배경에서 끝나도 닫지 않는다 */
    var downOnBackdrop = false;
    dialog.addEventListener("pointerdown", function (event) { downOnBackdrop = event.target === dialog; });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog && downOnBackdrop) { dialog.close(); }
      downOnBackdrop = false;
    });
    dialog.addEventListener("close", function () {
      document.documentElement.classList.remove("zoom-locked");
      img.removeAttribute("src");
      if (state.opener && document.contains(state.opener)) { state.opener.focus(); }
      state.opener = null;
    });
    return state;
  }

  function openZoom(src, alt, label, opener) {
    if (!zoom) { zoom = buildZoom(); }
    zoom.opener = opener;
    zoom.title.textContent = label;
    zoom.size.textContent = "이미지를 불러오는 중…";
    zoom.img.alt = alt || "";
    zoom.img.onload = function () {
      zoom.size.textContent = "원본 " + zoom.img.naturalWidth + " × " + zoom.img.naturalHeight + " px";
    };
    zoom.img.onerror = function () { zoom.size.textContent = "이미지를 불러오지 못했습니다."; };
    zoom.img.src = src;
    /* 좁은 화면에서는 글씨를 읽을 수 있게 원본 크기로 시작하고, 넓은 화면에서는 화면에 맞춘다 */
    zoom.setActual(window.innerWidth < 720);
    document.documentElement.classList.add("zoom-locked");
    zoom.dialog.showModal();
    zoom.dialog.querySelector(".zoom-close").focus();
  }

  /* 이미지를 감싸고 오른쪽 아래에 '확대' 버튼을 붙인다. 대화상자를 못 쓰는 브라우저에서는 이미지만 그대로 둔다 */
  function zoomable(img, label) {
    if (!zoomSupported() || !img.src) { return img; }
    var wrap = make("div", "zoom-wrap");
    wrap.appendChild(img);
    var button = make("button", "zoom-open");
    button.type = "button";
    button.setAttribute("aria-label", label + " 크게 보기");
    button.appendChild(zoomIcon());
    button.appendChild(make("span", "", "확대"));
    button.addEventListener("click", function () { openZoom(img.currentSrc || img.src, img.alt, label, button); });
    wrap.appendChild(button);
    return wrap;
  }

  /* PROJECT SNAPSHOT: 이미지 2장 비교 + 작업 화면 1장. 문구는 모두 HTML 텍스트(이미지에 합성하지 않음) */
  function snapFigure(item, className) {
    var fig = make("figure", "snap-fig " + (className || ""));
    var img = make("img");
    img.src = item.src; img.alt = item.alt || ""; img.width = item.w; img.height = item.h; img.loading = "lazy";
    fig.appendChild(zoomable(img, [item.tag, item.text].filter(Boolean).join(" · ")));
    var cap = make("figcaption", "snap-cap");
    cap.appendChild(make("span", "snap-tag", item.tag));
    cap.appendChild(make("span", "snap-text", item.text));
    fig.appendChild(cap);
    return fig;
  }

  function snapshotBlock(snap) {
    var box = make("section", "snapshot");
    box.setAttribute("aria-label", snap.label || "PROJECT SNAPSHOT");
    var head = make("header", "snap-head");
    head.appendChild(make("p", "snap-label", snap.label));
    head.appendChild(make("h2", "snap-title", snap.title));
    head.appendChild(make("p", "snap-sub", snap.sub));
    box.appendChild(head);
    var pair = make("div", "snap-pair");
    (snap.pair || []).forEach(function (item) { pair.appendChild(snapFigure(item)); });
    box.appendChild(pair);
    if (snap.making) { box.appendChild(snapFigure(snap.making, "snap-making")); }
    return box;
  }

  function renderDetail() {
    var article = $("#work-detail");
    if (!article) { return; }

    var id = new URLSearchParams(window.location.search).get("id");
    /* 분리 전 주소(work-1#kinetic)로 들어온 경우 키네틱타이포 페이지로 보낸다 */
    if (id === "work-1" && location.hash === "#kinetic") { location.replace("work.html?id=work-kinetic"); return; }
    var work = data.works.filter(function (entry) { return !entry.wip && entry.id === id; })[0];
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
        if (part.anchor) { section.id = part.anchor; }
        if (part.heading) { section.appendChild(make("h2", "part-title", part.heading)); }
        if (part.video) { section.appendChild(videoBlock(part.video, work, index)); }
        if (index === 0 && work.snapshot) { section.appendChild(snapshotBlock(work.snapshot)); }
        section.appendChild(fieldList(part.fields));
        var partDocs = docList(part.docs);
        if (partDocs) {
          var partDocBox = make("div", "part-docs");
          partDocBox.appendChild(make("h3", "part-docs-title", "제작 문서"));
          partDocBox.appendChild(partDocs);
          section.appendChild(partDocBox);
        }
        parts.appendChild(section);
      });
      (work.visuals || []).forEach(function (item) {
        var section = make("section", "detail-block project-visual");
        section.appendChild(make("h2", "part-title", item.heading));
        var figure = make("figure");
        var img = make("img");
        img.src = item.src;
        img.alt = item.alt;
        img.loading = "lazy";
        figure.appendChild(zoomable(img, item.heading));
        figure.appendChild(make("figcaption", "", item.text));
        section.appendChild(figure);
        parts.appendChild(section);
      });
    }

    /* #mv · #kinetic 처럼 해시로 들어오면 해당 영상 구역으로 이동. 브라우저의 자체 해시 이동이 끝난 뒤(load 이후)에 즉시 이동한다 */
    if (location.hash && location.hash.length > 1) {
      var goAnchor = function () {
        var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target) { target.scrollIntoView({ behavior: "instant" }); }
      };
      if (document.readyState === "complete") { setTimeout(goAnchor, 150); }
      else { window.addEventListener("load", function () { setTimeout(goAnchor, 150); }); }
    }

    var compare = $("#wd-compare");
    var related = work.related && data.works.filter(function (entry) { return entry.id === work.related.id; })[0];
    if (compare && related) {
      compare.textContent = "";
      compare.appendChild(make("h2", "part-title", work.related.heading));
      var relatedLink = make("a", "link-arrow", work.related.label + " ");
      relatedLink.href = workHref(related);
      relatedLink.appendChild(make("span", "", "→"));
      relatedLink.lastChild.setAttribute("aria-hidden", "true");
      compare.appendChild(relatedLink);
      compare.hidden = false;
    }

    var docs = $("#wd-docs");
    var workDocs = docList(work.docs);
    if (docs && workDocs) {
      docs.textContent = "";
      docs.appendChild(make("h2", "part-title", "제작 문서"));
      docs.appendChild(workDocs);
      docs.hidden = false;
    }
  }

  /* 상단 눈금자: 스크롤 위치를 재생헤드로 보여주고, HOME·WORKS·ABOUT·CONTACT 챕터를 마커로 표시한다.
     --p(스크롤 진행도)와 --vw(화면 폭)를 문서 전체에 공유해서, 섹션 제목 아래 눈금이 같은 가로 위치까지 채워진다. */
  function initPlayhead() {
    var ruler = $(".ruler");
    if (!ruler) { return; }
    var root = document.documentElement;
    var chapters = [];
    var ticking = false;
    var lastMax = -1;
    var OFFSET = 90; /* 고정 헤더 높이만큼 */

    ["home", "about", "works", "contact"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) { return; }
      var navLink = $('.site-nav a[href="#' + id + '"]');
      var noEl = $(".section-title .no", el);
      var mark = make("a", "ruler-mark");
      mark.href = "#" + id;
      mark.tabIndex = -1;
      mark.setAttribute("data-short", noEl ? noEl.textContent.trim() : "00");
      mark.appendChild(make("span", "ruler-mark-label", navLink ? navLink.textContent.trim() : id.toUpperCase()));
      ruler.appendChild(mark);
      chapters.push({ el: el, mark: mark, top: 0 });
    });

    function layout(max) {
      chapters.forEach(function (c) {
        c.top = c.el.getBoundingClientRect().top + (window.pageYOffset || 0) - OFFSET;
        var p = max > 0 ? Math.min(1, Math.max(0, c.top / max)) : 0;
        c.mark.style.left = (p * 100).toFixed(3) + "%";
        c.mark.classList.toggle("is-end", p > 0.9);
      });
    }
    function update() {
      ticking = false;
      var max = root.scrollHeight - window.innerHeight;
      var y = Math.max(0, window.pageYOffset || 0);
      var p = max > 0 ? Math.min(1, y / max) : 0;
      root.style.setProperty("--vw", root.clientWidth + "px");
      root.style.setProperty("--p", p.toFixed(4));
      ruler.style.setProperty("--p", p.toFixed(4));
      if (chapters.length) {
        if (max !== lastMax) { layout(max); lastMax = max; }
        var current = chapters[0];
        chapters.forEach(function (c) { if (c.top <= y + 1) { current = c; } });
        if (p >= 0.995) { current = chapters[chapters.length - 1]; }
        chapters.forEach(function (c) { c.mark.classList.toggle("is-current", c === current); });
      }
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", function () { lastMax = -1; update(); });
    window.addEventListener("load", function () { lastMax = -1; update(); });
    update();
  }

  function initReel() {
    var reel = $("#reel");
    var video = $("#reel-video");
    if (!reel || !video) { return; }
    var chips = reel.querySelectorAll(".chip");
    var tag = $(".reel-tag", reel);
    var fill = $("#reel-fill");
    var tc = $("#reel-tc");
    var toggle = $("#reel-toggle");
    var seek = $("#reel-seek");           /* input[type=range] */
    var status = $("#reel-status");
    var retry = $("#reel-retry");
    var source = $("source", video);
    if (!fill || !tc || !toggle) { return; }

    var FPS = 30;
    var KEY_STEP = 5;      /* 방향키 이동(초) */
    var PAGE_STEP = 10;    /* PageUp/PageDown 이동(초) */
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var userPaused = reduce;      // 움직임 줄이기 설정이면 자동 재생하지 않음
    var inView = true;
    var chapter = -1;
    var frameId = 0;
    var dragging = false;         // 포인터로 재생 위치를 잡고 있는 동안
    var pending = null;           // 사용자가 옮긴 목표 시간(시크가 끝날 때까지 화면 값으로 사용)
    var failed = false;           // 영상 파일을 불러오지 못한 상태
    var lastSecond = -1;
    var loadingTimer = 0;
    var bufferTimer = 0;

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function fmt(sec) {
      var s = Math.max(0, sec || 0);
      return "00:" + pad(Math.floor(s / 60) % 60) + ":" + pad(Math.floor(s) % 60) + ":" + pad(Math.floor((s % 1) * FPS));
    }
    function spoken(sec) {
      var s = Math.max(0, Math.floor(sec || 0));
      return (s >= 60 ? Math.floor(s / 60) + "분 " : "") + (s % 60) + "초";
    }
    function hasDuration() { return isFinite(video.duration) && video.duration > 0; }
    function clampTime(t) {
      if (!hasDuration()) { return Math.max(0, t); }
      return Math.min(Math.max(0, t), Math.max(0, video.duration - 0.1));
    }
    function chapterAt(t) {
      var found = 0;
      Array.prototype.forEach.call(chips, function (chip, i) {
        if (t >= Number(chip.getAttribute("data-start")) - 0.05) { found = i; }
      });
      return found;
    }

    /* 상태 안내: kind = "" | "loading" | "buffering" | "error" */
    function setStatus(kind) {
      if (!status) { return; }
      var text = "";
      if (kind === "loading") { text = "영상을 불러오는 중입니다…"; }
      else if (kind === "buffering") { text = "버퍼링 중입니다…"; }
      else if (kind === "error") { text = "하이라이트 릴 영상을 불러오지 못했습니다. 아래 작품 목록에서 각 영상을 볼 수 있습니다."; }
      if (status.textContent !== text) { status.textContent = text; }
      if (retry) { retry.hidden = kind !== "error"; }
    }

    /* 영상 정보(길이)가 준비되면 슬라이더를 켜고, 아니면 끈다 */
    function syncRange() {
      if (!seek) { return; }
      var ready = hasDuration() && !failed;
      seek.disabled = !ready;
      seek.max = ready ? String(video.duration) : "0";
    }

    function render() {
      var d = hasDuration() ? video.duration : 0;
      var t = (pending !== null && (dragging || video.seeking)) ? pending : (video.currentTime || 0);
      if (d && t > d) { t = d; }
      fill.style.width = (d ? Math.min(100, t / d * 100) : 0).toFixed(2) + "%";
      tc.textContent = fmt(t) + " / " + fmt(d);
      if (seek) {
        if (!dragging) { seek.value = String(t); }
        var whole = Math.floor(t);
        if (whole !== lastSecond) {
          lastSecond = whole;
          seek.setAttribute("aria-valuetext", d ? spoken(t) + " / " + spoken(d) : "영상 정보를 불러오는 중");
        }
      }
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

    /* 불러오기 실패 / 복구 */
    function fail() {
      if (failed) { return; }
      failed = true;
      window.clearTimeout(loadingTimer);
      window.clearTimeout(bufferTimer);
      reel.classList.add("is-static");
      syncRange();
      setStatus("error");
    }
    function recover() {
      window.clearTimeout(loadingTimer);
      if (failed) {
        failed = false;
        reel.classList.remove("is-static");
      }
      syncRange();
      setStatus("");
    }
    /* 1.5초가 지나도 정보가 없고 실제로 내려받는 중이면 안내(빠르게 열리면 깜빡이지 않게) */
    function watchLoading() {
      window.clearTimeout(loadingTimer);
      loadingTimer = window.setTimeout(function () {
        if (!failed && video.readyState < 1 && video.networkState === 2) { setStatus("loading"); }
      }, 1500);
    }

    video.addEventListener("play", function () { syncButton(); window.cancelAnimationFrame(frameId); loop(); });
    video.addEventListener("pause", function () { syncButton(); render(); });
    video.addEventListener("loadedmetadata", function () { recover(); render(); });
    video.addEventListener("durationchange", function () { syncRange(); render(); });
    video.addEventListener("loadeddata", recover);
    video.addEventListener("timeupdate", render);
    video.addEventListener("seeked", function () { if (!dragging) { pending = null; } render(); });
    /* 파일 요청 실패는 <source>에서 발생하고(video로 전달되지 않음), 디코딩 오류는 video에서 발생한다 */
    video.addEventListener("error", fail);
    if (source) { source.addEventListener("error", fail); }
    /* 재생 중 데이터가 모자랄 때만 짧게 안내(0.8초 이상 걸릴 때) */
    video.addEventListener("waiting", function () {
      window.clearTimeout(bufferTimer);
      bufferTimer = window.setTimeout(function () { if (!failed && !video.paused && video.readyState < 3) { setStatus("buffering"); } }, 800);
    });
    video.addEventListener("playing", function () { window.clearTimeout(bufferTimer); if (!failed) { setStatus(""); } });
    video.addEventListener("canplay", function () { window.clearTimeout(bufferTimer); if (!failed) { setStatus(""); } });

    /* 스크립트가 붙기 전에 이미 실패했을 수 있다(네트워크 상태 3 = 소스 없음) */
    if (video.error || video.networkState === 3) { fail(); }
    else { watchLoading(); }

    if (retry) {
      retry.addEventListener("click", function () {
        failed = false;
        reel.classList.remove("is-static");
        setStatus("loading");
        pending = null;
        video.load();
        watchLoading();
        if (!userPaused) { play(); }
      });
    }

    toggle.addEventListener("click", function () {
      if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
    });

    /* 사용자가 위치를 옮긴 뒤: 멈춰 있던 의도는 그대로 두고, 자동 재생이 막혀서 멈춘 경우에만 재생 */
    function afterUserSeek() {
      if (!userPaused && video.paused) { play(); }
    }
    function seekTo(t) {
      pending = clampTime(t);
      video.currentTime = pending;
      render();
    }

    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener("click", function () {
        seekTo(Number(chip.getAttribute("data-start")) || 0);
        afterUserSeek();
      });
    });

    if (seek) {
      /* 드래그·터치·키보드로 값이 바뀔 때마다 영상 위치를 따라 옮긴다 */
      seek.addEventListener("input", function () {
        if (!hasDuration()) { return; }
        seekTo(Number(seek.value));
      });
      seek.addEventListener("change", afterUserSeek);
      seek.addEventListener("pointerdown", function () {
        if (seek.disabled) { return; }
        dragging = true;
        reel.classList.add("is-seeking");
      });
      /* 슬라이더 밖에서 손을 떼도 끝나도록 창 전체에서 받는다 */
      var endDrag = function () {
        if (!dragging) { return; }
        dragging = false;
        reel.classList.remove("is-seeking");
        if (!video.seeking) { pending = null; }
        render();
      };
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
      seek.addEventListener("blur", endDrag);
      /* 방향키 이동량을 고정(초 단위)해서 브라우저마다 같게 동작시킨다 */
      seek.addEventListener("keydown", function (event) {
        if (seek.disabled) { return; }
        var now = pending !== null && video.seeking ? pending : (video.currentTime || 0);
        var next = null;
        switch (event.key) {
          case "ArrowRight": case "ArrowUp": next = now + KEY_STEP; break;
          case "ArrowLeft": case "ArrowDown": next = now - KEY_STEP; break;
          case "PageUp": next = now + PAGE_STEP; break;
          case "PageDown": next = now - PAGE_STEP; break;
          case "Home": next = 0; break;
          case "End": next = video.duration; break;
          default: return;
        }
        event.preventDefault();
        seekTo(next);
        afterUserSeek();
      });
    }

    // 화면 밖에서는 멈춰서 리소스를 아낀다(사용자가 직접 멈춘 경우는 그대로 유지)
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView && !userPaused && video.paused && !failed) { play(); }
        if (!inView && !video.paused) { video.pause(); }
      }, { threshold: 0.25 }).observe(reel);
    }

    syncRange();
    render();
    syncButton();
    if (!userPaused && !failed) { play(); }
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
