/* ==========================================================
   사이트 데이터 — 콘텐츠 초안 v04(2026-11-15) 기준. 문구를 고칠 때는 이 파일만 수정합니다.
   - 문구는 서술형 종결(~합니다 등)을 쓰지 않고 명사구·키워드·"라벨 : 값" 형식으로 씁니다.
   - videos[].url : https 유튜브/비메오 주소. 비워 두면 "영상 준비 중"이 표시됩니다.
   - docs : 제작 문서 PDF 목록. 비어 있으면 '제작 문서' 영역이 보이지 않습니다.
     예) docs: [{ label: "스토리보드", href: "assets/docs/work-2-storyboard.pdf" }]
   - 공개 저장소이므로 전화번호·상세 주소·생년월일 등 개인정보는 넣지 않습니다.
   ========================================================== */
window.SITE_DATA = {
  site: {
    name: "LEE JUNHEE",
    email: "bbutti79@gmail.com"
  },

  about: {
    name: "이준희",
    role: "영상 기획 · 제작 · 편집",
    headline: [
      "온라인 게임·서비스 기획 10년+ → 영상 기획·제작",
      "기획 · 프로덕션 관리 · 영상 제작 · AI 워크플로우"
    ],
    career: [
      { year: "2026", text: "AI 기반 실무형 3D 영상 크리에이터 양성 과정 수강 중" },
      { year: "2005 – 2018", text: "온라인 게임·서비스 기획 (NHN · 엠게임 · YDOnline · 네오싸이언 · 넷마블)" },
      { year: "2018 – 2022", text: "편의점 운영 (점주)" }
    ],
    toolGroups: [
      { label: "영상 · 모션", items: ["Premiere Pro", "After Effects"] },
      { label: "그래픽 · 3D (강의 학습)", items: ["Photoshop", "Illustrator", "Cinema 4D"] },
      { label: "AI", items: ["Seedance", "Runway", "Google Flow", "Higgsfield", "Midjourney", "Suno", "ChatGPT", "Claude", "Antigravity"] }
    ]
  },

  works: [
    {
      id: "work-1",
      no: "01",
      featured: true,
      title: "방구석 파이터의 비밀 순찰대",
      detailTitle: "방구석 파이터의 비밀 순찰대 + 키네틱타이포",
      subtitle: "MV + Kinetic Typography",
      short: "두 강아지의 비밀 순찰, 뮤직비디오와 타이포 모션",
      thumbs: [
        { src: "assets/img/work-1a.jpg", tag: "MUSIC VIDEO", ai: "Seedance · Google Flow · Runway · Suno", tools: "After Effects · Premiere Pro", alt: "방구석 파이터의 비밀 순찰대 대표 장면: 두 강아지" },
        { src: "assets/img/work-1b.jpg", tag: "KINETIC TYPOGRAPHY", ai: "Seedance · Higgsfield", tools: "After Effects", alt: "키네틱타이포 대표 장면: 지켜줄게 타이포와 두 강아지" }
      ],
      parts: [
        {
          heading: "방구석 파이터의 비밀 순찰대 (본편)",
          video: { label: "본편", url: "https://youtu.be/O1yg1X-ZAHg" },
          anchor: "mv",
          cardShort: "잠든 주인을 지키는 두 강아지의 비밀 순찰 · 약 3분",
          docs: [{ label: "기획서", href: "assets/docs/work-1-plan.pdf" }, { label: "사운드 기획서", href: "assets/docs/work-1-sound.pdf" }, { label: "스토리보드", href: "assets/docs/work-1-storyboard.pdf" }, { label: "비주얼 기획서", href: "assets/docs/work-1-visual.pdf" }],
          fields: [
            ["과제", "뮤직비디오 제작"],
            ["유형", "생성형 AI 애니메이션 뮤직비디오 (3D 스타일)"],
            ["길이", "약 3분"],
            ["로그라인", "잠든 주인을 지키는 두 강아지의 비밀 순찰"],
            ["기획 의도", "같은 집, 두 개의 시선 · 낮은 시점과 스케일로 만든 집 안의 모험 · 겁쟁이처럼 보이던 강아지들의 야간 순찰"],
            ["담당 역할", "기획 · 스토리보드 · AI 디렉팅 (프롬프트 설계 · 샷 구성) · 편집 · 자막 · 색보정"],
            ["AI · 소스", "영상·이미지 — Seedance, Google Flow, Runway / 음악 — Suno"],
            ["후반작업", "After Effects, Premiere Pro"],
            ["제작 기간", "2026.09 – 11"]
          ]
        },
        {
          heading: "키네틱타이포 (모션 적용본)",
          video: { label: "모션 타이포", url: "https://youtu.be/-hy7MMrEQO4" },
          anchor: "kinetic",
          cardTitle: "키네틱타이포",
          cardShort: "같은 노래를 가사 타이포 모션으로 다시 만든 버전 · 약 35초",
          docs: [{ label: "스토리보드", href: "assets/docs/work-1-kinetic-storyboard.pdf" }],
          fields: [
            ["과제", "모션그래픽과 키네틱 타이포그래피"],
            ["유형", "키네틱 타이포그래피 영상"],
            ["길이", "약 35초"],
            ["콘셉트", "같은 노래, 가사 타이포 모션으로 다시 만든 버전"],
            ["담당 역할", "타이포 · 모션그래픽"],
            ["AI · 소스", "Seedance, Higgsfield"],
            ["후반작업", "After Effects"]
          ]
        }
      ],
      compare: {
        heading: "두 영상의 차이",
        fields: [
          ["본편", "이야기 · 연출 중심"],
          ["모션 타이포", "타이포그래피 · 모션그래픽 중심"]
        ]
      },
      docs: []
    },
    {
      id: "work-2",
      no: "02",
      title: "크아아앙: 전설의 시작",
      tag: "AD FILM",
      short: "던전 보스 드래곤의 출근과 퇴근",
      thumbs: [{ src: "assets/img/work-2.jpg", ai: "Google Flow · Suno", tools: "Premiere Pro", alt: "크아아앙 대표 장면: 노움 여전사와 드래곤의 대치" }],
      parts: [
        {
          video: { label: "본편", url: "https://youtu.be/gJrfZl6HIhc" },
          fields: [
            ["과제", "AI 활용 30초 광고 제작"],
            ["유형", "판타지 코미디 광고"],
            ["길이", "약 30초"],
            ["로그라인", "출근하고 패배하고 칼퇴를 꿈꾸는 던전 보스 드래곤"],
            ["슬로건", "보스도 출근하고, 패배하고, 칼퇴를 꿈꾼다."],
            ["기획 의도", "보스 드래곤 × 직장인 공감 · 웅장한 판타지와 현실 일상의 대비 · 출근과 퇴근의 대칭 구성"],
            ["담당 역할", "기획 · 스토리보드 · AI 디렉팅 (프롬프트 설계 · 샷 구성) · 사운드 · 편집 · 색보정"],
            ["AI · 소스", "영상 — Google Flow 생성 / BGM — Suno 제작 / 효과음 — AI 영상 생성 시 포함된 음향 + Pixabay 일부"],
            ["후반작업", "Premiere Pro (사운드 · 편집 · 색보정)"],
            ["사운드 소스", "Suno · Google Flow · Pixabay"]
          ]
        }
      ],
      docs: [{ label: "스토리보드", href: "assets/docs/work-2-storyboard.pdf" }]
    },
    {
      id: "work-3",
      no: "03",
      title: "Normal Weekend",
      tag: "EDITING & SOUND",
      short: "평온한 주말 × 10000% 과장 사운드",
      thumbs: [{ src: "assets/img/work-3.jpg", ai: "Google Flow · Suno", tools: "Premiere Pro", alt: "Normal Weekend 대표 장면: 설거지 스펀지 클로즈업" }],
      parts: [
        {
          video: { label: "본편", url: "https://youtu.be/5ol06Ry-PKA" },
          fields: [
            ["과제", "외부소재 활용 편집"],
            ["유형", "사운드 코미디 숏폼"],
            ["길이", "약 1분 45초"],
            ["로그라인", "평온한 주말 × 10000% 과장된 사운드"],
            ["기획 의도", "평온한 화면과 과격한 사운드의 대비 · 같은 행동, 다른 소리 · 완전한 정적으로 끝나는 엔딩"],
            ["담당 역할", "기획 · 컷 편집 · 사운드 편집 (믹싱 · 보정)"],
            ["AI · 스톡 소스", "영상 — Google Flow 생성 + Pixabay 무료 영상 / 효과음 — Pixabay 무료 사운드 / BGM — Suno"],
            ["후반작업", "Premiere Pro (컷 편집 · 믹싱 · 보정)"],
            ["소스 출처", "영상·사운드 소스: Pixabay · Google Flow · Suno"]
          ]
        }
      ],
      docs: [{ label: "스토리보드", href: "assets/docs/work-3-storyboard.pdf" }]
    },
    {
      id: "work-4",
      no: "04",
      title: "마음의 장마",
      tag: "CAMPAIGN FILM",
      short: "고립은 장마로, 관심은 노란 우산으로",
      thumbs: [{ src: "assets/img/work-4.jpg", ai: "Google Flow · Midjourney · Suno", tools: "Premiere Pro · After Effects", alt: "마음의 장마 대표 장면: 노란 우산 아래 두 인물" }],
      parts: [
        {
          video: { label: "본편", url: "https://youtu.be/4BU09Yfcsy4" },
          fields: [
            ["과제", "캠페인 주제에 맞는 영상 제작"],
            ["주제", "자살예방 공익 캠페인"],
            ["유형", "공익 애니메이션 (3D 피규어 스타일)"],
            ["길이", "약 1분 35초"],
            ["로그라인", "고립은 장마로, 관심은 노란 우산으로"],
            ["기획 의도", "해결보다 동행 · 충고보다 공감 · 관심의 확산 · 직접 묘사 대신 장마와 투명화의 은유"],
            ["담당 역할", "기획 · 스토리보드 · AI 디렉팅 (프롬프트 설계 · 샷 구성) · 사운드 제작 · 편집 · 색보정 · 로토스코핑 · 투명화 합성"],
            ["AI · 소스", "영상·이미지 — Google Flow, Midjourney 생성 / 음악 — Suno"],
            ["후반작업", "Premiere Pro (사운드 · 편집 · 색보정) / After Effects (주인공 캐릭터 로토스코핑 · 점진적 투명화 합성)"],
            ["제작 포인트", "점진적 투명화 — 존재감 상실의 시각화"]
          ]
        }
      ],
      docs: [{ label: "스토리보드", href: "assets/docs/work-4-storyboard.pdf" }]
    }
  ]
};
