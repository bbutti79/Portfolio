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
    var cell = make("article", "tile");
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
    var targets = document.querySelectorAll(".section-head, .featured, .tile, .about-top, .tools, .contact-email, .contact-actions");
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
    main.appendChild(top);
    layout.appendChild(main);
    box.appendChild(layout);

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
    main.appendChild(tools);
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

  /* PROJECT SNAPSHOT: 이미지 2장 비교 + 작업 화면 1장. 문구는 모두 HTML 텍스트(이미지에 합성하지 않음) */
  function snapFigure(item, className) {
    var fig = make("figure", "snap-fig " + (className || ""));
    var img = make("img");
    img.src = item.src; img.alt = item.alt || ""; img.width = item.w; img.height = item.h; img.loading = "lazy";
    fig.appendChild(img);
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
        figure.appendChild(img);
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

    ["home", "works", "about", "contact"].forEach(function (id) {
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
