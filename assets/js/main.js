/* 공통 스크립트: 모바일 햄버거 메뉴 + 데이터 기반 렌더링(홈/작품 상세)
   모든 텍스트는 textContent로만 넣어서 데이터에 HTML이 섞여도 실행되지 않습니다. */
(function () {
  "use strict";

  var data = window.SITE_DATA || { site: {}, about: {}, contact: {}, works: [] };

  /* ---------- 작은 도우미 ---------- */
  function $(selector, root) { return (root || document).querySelector(selector); }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function setText(selector, value) {
    var node = $(selector);
    if (node && value !== undefined && value !== null) { node.textContent = value; }
  }

  function fillList(selector, items, itemClass) {
    var list = $(selector);
    if (!list) { return; }
    list.textContent = "";
    (items || []).forEach(function (item) {
      list.appendChild(make("li", itemClass || "", item));
    });
  }

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
      id = url.pathname.slice(1);
    }
    if (id && idPattern.test(id)) {
      return "https://www.youtube-nocookie.com/embed/" + id;
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      var match = url.pathname.match(/(\d{5,})/);
      if (match) { return "https://player.vimeo.com/video/" + match[1]; }
    }
    return null;
  }

  /* ---------- 홈 ---------- */
  function renderHome() {
    var grid = $("#works-grid");
    if (!grid) { return; }

    setText("#hero-title", data.site.heroTitle);
    setText("#hero-message", data.site.heroMessage);

    grid.textContent = "";
    data.works.forEach(function (work) {
      var item = make("li");
      var card = make("a", "work-card");
      card.href = "work.html?id=" + encodeURIComponent(work.id);

      var thumb = make("div", "thumb");
      if (work.thumb) {
        var img = make("img");
        img.src = work.thumb;
        img.alt = work.title + " 썸네일";
        img.loading = "lazy";
        thumb.appendChild(img);
      } else {
        thumb.textContent = "썸네일 (임시)";
      }

      var body = make("div", "work-card-body");
      body.appendChild(make("h3", "", work.title));
      body.appendChild(make("p", "", [work.category, work.role].filter(Boolean).join(" · ")));

      card.appendChild(thumb);
      card.appendChild(body);
      item.appendChild(card);
      grid.appendChild(item);
    });

    setText("#about-intro", data.about.intro);
    fillList("#about-career", data.about.career);
    fillList("#about-strengths", data.about.strengths);
    fillList("#about-tools", data.about.tools);

    setText("#contact-note", data.contact.note);
    var links = $("#contact-links");
    if (links) {
      links.textContent = "";
      (data.contact.links || []).forEach(function (entry) {
        var item = make("li");
        var href = entry.href || "";
        if (/^(https:\/\/|mailto:)/.test(href)) {
          var anchor = make("a", "", entry.label);
          anchor.href = href;
          if (href.indexOf("https://") === 0) {
            anchor.target = "_blank";
            anchor.rel = "noopener noreferrer";
          }
          item.appendChild(anchor);
        } else {
          item.appendChild(make("span", "link-pending", entry.label + " (확정 전)"));
        }
        links.appendChild(item);
      });
    }
  }

  /* ---------- 작품 상세 ---------- */
  function renderDetail() {
    var article = $("#work-detail");
    if (!article) { return; }

    var id = new URLSearchParams(window.location.search).get("id");
    var work = data.works.filter(function (entry) { return entry.id === id; })[0];
    var missing = $("#work-missing");

    if (!work) {
      article.hidden = true;
      if (missing) { missing.hidden = false; }
      document.title = "작품을 찾을 수 없음 | " + (data.site.name || "Portfolio");
      return;
    }

    document.title = work.title + " | " + (data.site.name || "Portfolio");
    setText("#wd-title", work.title);
    setText("#wd-meta", [work.category, work.role && ("담당 역할: " + work.role)].filter(Boolean).join(" · "));
    setText("#wd-overview", work.overview);
    setText("#wd-intent", work.intent);
    fillList("#wd-process", work.process);
    setText("#wd-ai-usage", work.ai && work.ai.usage);
    fillList("#wd-ai-tools", work.ai && work.ai.tools);

    var frame = $("#wd-video");
    if (frame) {
      frame.textContent = "";
      var embed = toEmbedUrl(work.videoUrl);
      if (embed) {
        var iframe = make("iframe");
        iframe.src = embed;
        iframe.title = work.title + " 영상";
        iframe.loading = "lazy";
        iframe.allowFullscreen = true;
        iframe.setAttribute("allow", "accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen");
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        frame.appendChild(iframe);
      } else {
        frame.appendChild(make("span", "", "영상 준비 중"));
      }
    }
  }

  initNav();
  renderHome();
  renderDetail();
})();
