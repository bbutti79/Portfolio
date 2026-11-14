# Portfolio

개인 영상 포트폴리오 사이트. 빌드 도구 없이 HTML·CSS·JavaScript만 쓰는 정적 사이트이며 GitHub Pages로 공개됩니다.
디자인은 `01.디자인템플릿`의 "따뜻한 감성의 3D 영상 포트폴리오" 템플릿을 기준으로 합니다(색 값은 이미지에서 읽은 추정값).

## 구조
| 파일 | 역할 |
|---|---|
| `index.html` | HOME 원페이지 (HERO → WORKS → ABOUT → CONTACT). HERO 문구는 이 파일에 직접 들어 있습니다. |
| `work.html` | 작품 상세 공통 템플릿. `work.html?id=작품ID`로 열립니다. |
| `assets/js/works-data.js` | **내용 데이터(콘텐츠 초안 v04 기준)**. 작품·ABOUT·연락처 문구는 여기만 고치면 반영됩니다. |
| `assets/js/main.js` | 모바일 햄버거 메뉴, 데이터 렌더링, 이메일 복사 |
| `assets/css/style.css` | 스타일. 맨 위 `:root`의 색상·글꼴 값만 바꾸면 전체에 반영됩니다. |
| `assets/img/` | 대표 이미지(`work-*.jpg`), HERO 키비주얼(`hero.jpg`), 공유 미리보기(`og.jpg`) |

## 자주 하는 작업
- **영상 링크 넣기**: `works-data.js`의 `videos`가 아니라 각 작품 `parts[].video.url`에 https 유튜브/비메오 주소를 넣습니다. 비워 두면 "영상 준비 중"이 표시됩니다. 영상 원본 파일은 이 저장소에 올리지 않습니다.
- **HERO 이미지 교체**: `assets/img/hero.jpg`를 같은 이름의 4:3 이미지(권장 1200×900, 300KB 이하)로 바꿉니다.
- **제작 문서(PDF) 링크**: PDF를 `assets/docs/`에 넣고 해당 작품의 `docs`에 `{ label: "기획서", href: "assets/docs/파일명.pdf" }`를 추가합니다. `docs`가 비어 있으면 화면에 나타나지 않습니다.
- **문구 규칙**: 서술형 종결(~합니다 등)을 쓰지 않고 명사구·키워드·`라벨 : 값` 형식으로 씁니다.

## 주의
이 저장소는 공개(Public)입니다. 전화번호, 상세 주소, 생년월일 등 개인정보는 넣지 않습니다.
