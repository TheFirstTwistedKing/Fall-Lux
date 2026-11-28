/* ════════════════════════════════════════════════════════════════
   행성별 이야기 지도
   - type: "book" = 이야기, "star" = 전투 · 탐색, "both" = 이야기 + 전투 · 탐색
   - x, y: 가로 화면 기준 0~1 위치 (세로 화면에서는 자동으로 위→아래 흐름이 된다)
   - next: 이어지는 노드. 2개 이상이면 선택지(갈래)가 된다
   - body: 이야기 본문. 문자열(빈 줄로 문단 구분) 또는 문단 배열. 책 노드는 스크롤로 읽는다
   - game: 빛 노드의 게임 난이도 { shards: 모을 빛 조각 수, shadows: 그림자 수, speed: 빠르기 배율 }
   - 아직 본문은 비어 있다. 작가가 채운다
   ════════════════════════════════════════════════════════════════ */
export const STORY = {
  1: {
    nodes: [
      { id: "p1-1", type: "book", x: 0.1, y: 0.56, next: ["p1-2"] },
      { id: "p1-2", type: "star", x: 0.27, y: 0.34, next: ["p1-3"], game: { shards: 3, shadows: 1 } },
      { id: "p1-3", type: "both", x: 0.45, y: 0.52, next: ["p1-4", "p1-5"], game: { shards: 4, shadows: 2 } },
      { id: "p1-4", type: "book", x: 0.65, y: 0.28, next: ["p1-6"] },
      { id: "p1-5", type: "star", x: 0.66, y: 0.74, next: ["p1-6"], game: { shards: 5, shadows: 2 } },
      { id: "p1-6", type: "both", x: 0.88, y: 0.5, next: [], game: { shards: 5, shadows: 3, speed: 1.1 } }
    ]
  }
};
