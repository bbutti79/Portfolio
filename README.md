# Portfolio

개인 영상 포트폴리오 사이트 (제작 중). 빌드 도구 없이 HTML·CSS·JavaScript만 쓰는 정적 사이트이며 GitHub Pages로 공개됩니다.

## 구조
| 파일 | 역할 |
|---|---|
| `index.html` | HOME 원페이지 (HERO → WORKS → ABOUT → CONTACT) |
| `work.html` | 작품 상세 공통 템플릿. `work.html?id=작품ID`로 열립니다. |
| `assets/js/works-data.js` | **내용 데이터(현재 모두 임시)**. 여기만 고치면 홈과 모든 상세 페이지에 반영됩니다. |
| `assets/js/main.js` | 모바일 햄버거 메뉴, 데이터 렌더링 |
| `assets/css/style.css` | 스타일. 맨 위의 색상·글꼴 값은 임시이며 스타일가이드 확정 후 이 값만 바꾸면 됩니다. |

## 작품 추가·교체
`assets/js/works-data.js`의 `works` 목록을 수정합니다. 영상은 `videoUrl`에 https 유튜브/비메오 주소를 넣으면 상세 페이지에 표시됩니다. 영상 원본 파일은 이 저장소에 올리지 않습니다.

## 주의
이 저장소는 공개(Public)입니다. 전화번호, 상세 주소, 생년월일 등 개인정보는 넣지 않습니다.
