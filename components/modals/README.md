# components/modals/

현재 이 프로젝트는 모달(Reject, Delete, Share, NewBadges)을 `app/home/page.tsx` 안에 인라인으로
작성해 놓았습니다. 프로젝트가 커지면 다음과 같이 분리해보세요.

- `RejectDialog.tsx` — 인증 반려 이유 선택
- `DeleteConfirm.tsx` — 청소 항목 삭제 확인
- `ShareModal.tsx` — 파트너 초대 링크 공유
- `NewBadgesModal.tsx` — 새 배지 획득 축하

Claude Code에 "home/page.tsx의 모달들을 components/modals/ 아래로 분리해줘"라고 요청하면
자동으로 리팩터링해 줍니다.
