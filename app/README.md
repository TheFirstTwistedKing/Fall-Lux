# Fall-Lux 앱 (exe · apk)

소설 관리 앱의 소스입니다. 화면 전체가 `src/index.html` 하나에 들어 있고, 이것을 Windows(Electron)와 Android(Capacitor)로 감쌉니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `src/index.html` | 앱 본체 (메인 · 세계관 · 설정, 하늘/혜성/캠코더 연출, 타임라인 세이브) |
| `src/fonts/` | 송명(Song Myung), IM Fell English 글꼴 (SIL OFL 1.1) |
| `src/map.js` | 3D 행성 지도 (three.js, 셰이더 행성 · 혜성 · 블랙홀 · 글리치 전환) |
| `src/bodies.js` | 지도 위 천체의 배치 · 잠김 · 정보 문구 (외부 묘사는 초안) |
| `src/story.js` | 행성 안 이야기 지도 (책 · 별 아이콘, 노랑 · 민트 빛줄기) |
| `src/play.js` | 빛 노드 게임 (빛 조각 모으기 · 그림자 피하기) |
| `src/story-data.js` | 행성별 이야기 노드 (제목 · 본문은 비어 있음) |
| `build.mjs` | 글꼴과 3D 코드를 넣어 단일 HTML `dist/index.html` 생성 |
| `electron/main.cjs` | Windows exe 진입점 |
| `android/` | Capacitor 안드로이드 프로젝트 |

## 빌드

```bash
npm install
npm run build          # dist/index.html
npm start              # Electron으로 바로 실행
npm run dist:win       # Windows exe (Linux에서는 wine 필요)
npm run android:apk    # 디버그 APK (Android SDK 필요)
```

## 타임라인(세이브) API

스토리 화면에서 아래 API로 저장합니다. 행성마다 타임라인 목록이 따로 있습니다.

```js
FallLux.timeline.create(planetId, { node, choices, flags })  // 새 타임라인
FallLux.timeline.save(planetId, id, { node, choices, flags })
FallLux.timeline.load(planetId, id)
FallLux.timeline.list(planetId)
FallLux.timeline.remove(planetId, id)
FallLux.timeline.timeTravel(planetId, id, toNode)
// 제 1 행성: 같은 타임라인 안에서 루프 (loop +1)
// 그 외 행성: 새 타임라인으로 분기
FallLux.lore.unlock("planet-1")   // 스토리에서 만난 설정을 세계관에 기록
```
