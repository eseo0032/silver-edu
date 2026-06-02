/* ==========================================================================
   실버교육기관 루먼픽 (Lumanpick) - 맞춤형 인터랙션 스크립트
   ========================================================================== */

// 교육 일지 전역 배열 선언
let educationLogs = [];

document.addEventListener('DOMContentLoaded', () => {
  // 웹페이지 로드 시 초기 설정 실행
  initMemoryGame();
  resetPhoneMission();
  initEducationLogs(); // [신규] 교육 일지 스토리지 엔진 초기화
  
  // 모달 외부 클릭 시 닫기 이벤트 등록
  window.onclick = function(event) {
    const helpModal = document.getElementById('helpModal');
    const successModal = document.getElementById('gameSuccessModal');
    const adminPanel = document.getElementById('adminPanel');
    if (event.target === helpModal) {
      closeHelpModal();
    }
    if (event.target === successModal) {
      closeSuccessModal();
    }
    if (event.target === adminPanel) {
      toggleAdminMode();
    }
  };

  // 날짜 입력 칸 기본값 설정 (오늘 날짜)
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('logDate');
  if (dateInput) {
    dateInput.value = today;
  }
});

/* ==========================================================================
   1. 접근성 조절 도구 (Font Size & Contrast Mode)
   ========================================================================== */

/**
 * 글씨 크기(배율)를 조절하고 버튼의 활성화태세를 갱신합니다.
 * @param {string} size - 'small', 'normal', 'large'
 */
function changeFontSize(size) {
  const htmlElement = document.documentElement;
  let scale = 1.0;
  
  const textBtns = document.querySelectorAll('.btn-text-ctrl');
  textBtns.forEach(btn => btn.classList.remove('active'));
  
  if (size === 'small') {
    scale = 0.85;
    event.target.classList.add('active');
  } else if (size === 'normal') {
    scale = 1.0;
    document.getElementById('btnNormalFont').classList.add('active');
  } else if (size === 'large') {
    scale = 1.30; // 130% 큼직하게 확대
    event.target.classList.add('active');
  }
  
  htmlElement.style.setProperty('--font-scale', scale);
  announceToScreenReader(`글자 크기가 ${size === 'small' ? '작게' : size === 'normal' ? '보통 크기로' : '크게'} 조절되었습니다.`);
}

/**
 * 🌓 고대비 화면 대비 상태를 토글합니다.
 */
function toggleContrastMode() {
  const body = document.body;
  const isHighContrast = body.classList.toggle('high-contrast');
  const btn = document.getElementById('contrastBtn');
  
  if (isHighContrast) {
    btn.innerHTML = `<span class="icon">☀️</span> <span class="btn-label font-medium">기본 밝은화면</span>`;
    btn.classList.add('active');
    btn.setAttribute('aria-label', '기본 밝은 화면으로 돌아가기');
    announceToScreenReader('눈이 편안한 고대비 검은 화면 모드가 켜졌습니다.');
  } else {
    btn.innerHTML = `<span class="icon">🌓</span> <span class="btn-label font-medium">고대비 화면</span>`;
    btn.classList.remove('active');
    btn.setAttribute('aria-label', '고대비 어두운 화면 켜기');
    announceToScreenReader('기본 밝은 화면 모드로 돌아왔습니다.');
  }
}

/**
 * 스크린리더 사용자(시각장애인)를 위한 ARIA 상태 알리미
 */
function announceToScreenReader(message) {
  let announcer = document.getElementById('srAnnouncer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'srAnnouncer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.style.position = 'absolute';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.padding = '0';
    announcer.style.overflow = 'hidden';
    announcer.style.clip = 'rect(0, 0, 0, 0)';
    announcer.style.whiteSpace = 'nowrap';
    announcer.style.border = '0';
    document.body.appendChild(announcer);
  }
  announcer.textContent = '';
  setTimeout(() => {
    announcer.textContent = message;
  }, 100);
}


/* ==========================================================================
   2. 🔊 음성 읽어주기 (TTS - Text to Speech Engine)
   ========================================================================== */

let currentUtterance = null;

/**
 * 전달받은 텍스트를 목소리로 출력합니다.
 * @param {string} text - 읽어줄 한글 텍스트
 */
function speakText(text) {
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    if (currentUtterance && currentUtterance.text === text) {
      currentUtterance = null;
      return;
    }
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.82; 
  utterance.pitch = 1.0; 

  const voices = window.speechSynthesis.getVoices();
  const koreanVoice = voices.find(voice => voice.lang.includes('ko-KR'));
  if (koreanVoice) {
    utterance.voice = koreanVoice;
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}


/* ==========================================================================
   3. [신규] ⚙️ 관리자 대시보드 및 교육 일지 스토리지 엔진 (Admin & CRUD)
   ========================================================================== */

// 5개 카테고리 매핑용 상수
const categoryMeta = {
  cognitive: { name: '🧠 인지향상교육', badgeClass: 'badge-cognitive' },
  behavioral: { name: '🏃 행동발달교육', badgeClass: 'badge-behavioral' },
  vibe: { name: '🎨 바이브향상교육', badgeClass: 'badge-vibe' },
  psychological: { name: '💬 심리상담지원', badgeClass: 'badge-psychological' },
  others: { name: '🌸 기타 영역', badgeClass: 'badge-others' }
};

/**
 * 교육 일지 데이터를 초기화하고 적재합니다.
 */
function initEducationLogs() {
  const localData = localStorage.getItem('luman_education_logs');
  
  if (localData) {
    educationLogs = JSON.parse(localData);
  } else {
    // 최초 실행 시 기본 피드값 세팅 (Pre-seeding)
    educationLogs = [
      {
        id: 1,
        category: 'cognitive',
        title: '두뇌 생생 기억력 훈련 및 이모티콘 맞추기 4회기',
        date: '2026-06-02',
        instructor: '이지혜 퍼실리테이터',
        desc: '어르신 여덟 분과 함께 인지 강화 카드 뒤집기 실습 세션을 가졌습니다. 게임을 클리어할 때마다 다 함께 박수를 치며 기뻐하셨으며, 평소보다 놀라운 속도로 짝을 정확하게 맞추셨습니다.'
      },
      {
        id: 2,
        category: 'behavioral',
        title: '야외 야생화 정원 탄성 밴드 관절 스트레칭',
        date: '2026-06-01',
        instructor: '김성호 신체지도 강사',
        desc: '따뜻한 햇살 아래서 탄성 저항 고무 밴드를 활용해 어깨와 다리 스트레칭 밸런스 운동을 실시했습니다. 무릎 관절에 무리 없이 시원한 관절 이완을 도와 드렸고, 통증이 한결 유연해졌다며 어르신들이 크게 웃으셨습니다.'
      },
      {
        id: 3,
        category: 'psychological',
        title: '정서 안심을 위한 1대1 차 한잔 마음 경청 진단',
        date: '2026-05-30',
        instructor: '최윤정 심리상담실장',
        desc: '외로움과 정서적 고립감을 극복하기 위해 다도 힐링 미술 심리 진단을 가졌습니다. 어르신의 노년기 고민을 따뜻하게 경청하였으며, 마음이 한결 가벼워지고 후련하다는 다정한 소감을 나누어 주셨습니다.'
      }
    ];
    localStorage.setItem('luman_education_logs', JSON.stringify(educationLogs));
  }

  // 화면 테이블 및 게시판 렌더링
  renderAdminTable();
  renderClientFeed('all');
}

/**
 * 관리자 패널 화면을 토글합니다.
 */
function toggleAdminMode() {
  const adminPanel = document.getElementById('adminPanel');
  const toggleBtn = document.getElementById('adminToggleBtn');
  const isHidden = adminPanel.classList.contains('d-none');
  
  if (isHidden) {
    adminPanel.classList.remove('d-none');
    toggleBtn.classList.add('active');
    speakText("관리자 교육 일지 관리 창이 열렸습니다. 새로운 교육 내용을 등록하거나 삭제하실 수 있습니다.");
    renderAdminTable();
  } else {
    adminPanel.classList.add('d-none');
    toggleBtn.classList.remove('active');
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }
}

/**
 * 관리자 테이블 목록을 렌더링합니다.
 */
function renderAdminTable() {
  const tableBody = document.getElementById('adminLogTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  // 날짜 역순 정렬
  const sortedLogs = [...educationLogs].sort((a, b) => b.date.localeCompare(a.date));

  if (sortedLogs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted font-medium">등록된 교육 일지가 없습니다.</td></tr>`;
    return;
  }

  sortedLogs.forEach(log => {
    const row = document.createElement('tr');
    const catName = categoryMeta[log.category]?.name || log.category;
    
    row.innerHTML = `
      <td class="font-medium">${catName}</td>
      <td class="font-medium">${log.date}</td>
      <td class="font-bold">${log.title}</td>
      <td class="font-medium">${log.instructor}</td>
      <td>
        <button class="btn-delete-log" onclick="deleteEducationLog(${log.id})" aria-label="${log.title} 일지 삭제">삭제 ✖</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

/**
 * 클라이언트 게시판(피드 카드)을 카테고리에 맞춰 렌더링합니다.
 * @param {string} filterCategory - 'all' 또는 특정 카테고리값
 */
function renderClientFeed(filterCategory = 'all') {
  const feedGrid = document.getElementById('educationFeedGrid');
  if (!feedGrid) return;

  feedGrid.innerHTML = '';

  // 날짜 역순 정렬
  const sortedLogs = [...educationLogs].sort((a, b) => b.date.localeCompare(a.date));

  // 필터링 적용
  const filteredLogs = filterCategory === 'all' 
    ? sortedLogs 
    : sortedLogs.filter(log => log.category === filterCategory);

  if (filteredLogs.length === 0) {
    feedGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 60px 20px;" class="text-center text-muted">
        <span style="font-size: 3rem; display: block; margin-bottom: 16px;">🌸</span>
        <p class="font-large">아직 등록된 ${categoryMeta[filterCategory]?.name || ''} 일지가 없습니다.</p>
        <p class="font-medium text-muted mt-2">관리자 공간에서 첫 교육 일지를 자유롭게 작성해 보세요!</p>
      </div>
    `;
    return;
  }

  filteredLogs.forEach(log => {
    const card = document.createElement('article');
    card.classList.add('feed-card');
    card.setAttribute('role', 'article');
    
    const cat = categoryMeta[log.category] || { name: log.category, badgeClass: 'badge-others' };

    card.innerHTML = `
      <div class="feed-card-header font-small">
        <span class="feed-card-badge ${cat.badgeClass}">${cat.name}</span>
        <span class="feed-card-date">${log.date}</span>
      </div>
      <h3 class="feed-card-title">${log.title}</h3>
      <p class="feed-card-desc font-medium">${log.desc}</p>
      <div class="feed-card-footer font-medium">
        <span class="feed-card-instructor">✍️ ${log.instructor}</span>
        <button onclick="speakText('${log.title}. ${log.desc}')" class="btn-tts-sm" aria-label="일지 텍스트 목소리로 읽기">🔊</button>
      </div>
    `;

    feedGrid.appendChild(card);
  });
}

/**
 * 클라이언트 게시판 카테고리 필터 스위칭
 * @param {string} category 
 */
function filterEducationFeed(category) {
  // 모든 탭 버튼 비활성화
  const tabs = document.querySelectorAll('.btn-filter-tab');
  tabs.forEach(tab => {
    tab.classList.remove('active');
    tab.setAttribute('aria-selected', 'false');
  });

  // 선택한 탭 활성화
  const activeTab = document.getElementById(`tab-${category}`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
  }

  // 피드 재선언
  renderClientFeed(category);
  
  const catKorean = category === 'all' ? '전체' : categoryMeta[category]?.name || '';
  speakText(`${catKorean} 교육 일지만 정렬하여 보여드립니다.`);
}

/**
 * 관리자 패널 새 일지 등록 폼 제출 핸들러 (Create)
 */
function handleLogSubmit(event) {
  event.preventDefault();

  const category = document.getElementById('logCategory').value;
  const title = document.getElementById('logTitle').value.trim();
  const date = document.getElementById('logDate').value;
  const instructor = document.getElementById('logInstructor').value.trim();
  const desc = document.getElementById('logDesc').value.trim();

  if (!category || !title || !date || !instructor || !desc) {
    alert("모든 입력 항목을 빠짐없이 채워주세요.");
    return;
  }

  // 신규 일지 생성
  const newLog = {
    id: Date.now(), // 타임스탬프로 고유 ID 생성
    category,
    title,
    date,
    instructor,
    desc
  };

  // 기존 스토리지 목록에 추가 후 동기화
  educationLogs.push(newLog);
  localStorage.setItem('luman_education_logs', JSON.stringify(educationLogs));

  // 화면 재렌더링
  renderAdminTable();
  renderClientFeed('all');

  // 필터 전체 탭으로 동기화
  filterEducationFeed('all');

  // 폼 리셋
  document.getElementById('adminLogForm').reset();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('logDate').value = today;

  speakText("새로운 루먼픽 교육 일지가 메인 게시판에 실시간으로 성공적으로 게시되었습니다.");
}

/**
 * 등록된 교육 일지 삭제 핸들러 (Delete)
 * @param {number} id 
 */
function deleteEducationLog(id) {
  const targetIndex = educationLogs.findIndex(log => log.id === id);
  if (targetIndex === -1) return;

  const targetTitle = educationLogs[targetIndex].title;

  if (confirm(`[삭제 경고]\n"${targetTitle}"\n해당 교육 일지를 메인 게시판에서 영구 삭제하시겠습니까?`)) {
    educationLogs.splice(targetIndex, 1);
    localStorage.setItem('luman_education_logs', JSON.stringify(educationLogs));
    
    renderAdminTable();
    renderClientFeed('all');
    filterEducationFeed('all');
    
    speakText("선택하신 교육 일지가 목록에서 정상적으로 삭제되었습니다.");
  }
}


/* ==========================================================================
   4. 🧠 체험존 1: '두뇌 생생' 카드 매칭 게임 (Memory Game Engine)
   ========================================================================== */

const memoryEmojis = ['🍎', '🌟', '🧡', '🎸', '🍎', '🌟', '🧡', '🎸'];
let flippedCards = [];
let matchedPairs = 0;
let isBoardLocked = false;

function initMemoryGame() {
  const cardBoard = document.getElementById('cardBoard');
  if (!cardBoard) return;
  
  cardBoard.innerHTML = '';
  flippedCards = [];
  matchedPairs = 0;
  isBoardLocked = false;
  document.getElementById('flipScore').textContent = '0';

  const shuffled = [...memoryEmojis];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  shuffled.forEach((emoji, index) => {
    const card = document.createElement('button');
    card.classList.add('game-card');
    card.setAttribute('role', 'gridcell');
    card.setAttribute('aria-label', `${index + 1}번째 카드. 뒤집으려면 누르세요.`);
    card.dataset.emoji = emoji;
    card.dataset.index = index;

    card.innerHTML = `
      <div class="card-back">❓</div>
      <div class="card-front">${emoji}</div>
    `;

    card.addEventListener('click', () => handleCardFlip(card));
    cardBoard.appendChild(card);
  });
}

function handleCardFlip(card) {
  if (isBoardLocked || card.classList.contains('flipped') || card.classList.contains('matched')) {
    return;
  }

  card.classList.add('flipped');
  card.setAttribute('aria-label', `카드 공개: ${card.dataset.emoji}`);
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    checkCardMatch();
  }
}

function checkCardMatch() {
  isBoardLocked = true;
  const [card1, card2] = flippedCards;

  if (card1.dataset.emoji === card2.dataset.emoji) {
    setTimeout(() => {
      card1.classList.add('matched');
      card2.classList.add('matched');
      card1.setAttribute('aria-label', `짝을 맞춘 카드: ${card1.dataset.emoji}`);
      card2.setAttribute('aria-label', `짝을 맞춘 카드: ${card2.dataset.emoji}`);
      
      matchedPairs++;
      document.getElementById('flipScore').textContent = matchedPairs;
      flippedCards = [];
      isBoardLocked = false;

      speakText("맞췄습니다! 참 잘하셨어요.");

      if (matchedPairs === 4) {
        setTimeout(showSuccessModal, 600);
      }
    }, 400);
  } else {
    setTimeout(() => {
      card1.classList.remove('flipped');
      card2.classList.remove('flipped');
      card1.setAttribute('aria-label', `${parseInt(card1.dataset.index) + 1}번째 카드. 다시 누르세요.`);
      card2.setAttribute('aria-label', `${parseInt(card2.dataset.index) + 1}번째 카드. 다시 누르세요.`);
      flippedCards = [];
      isBoardLocked = false;
    }, 1000);
  }
}

function restartMemoryGame() {
  initMemoryGame();
  speakText("두뇌 게임 카드가 새롭게 섞였습니다. 다시 시작해 보세요!");
}


/* ==========================================================================
   5. 📱 체험존 2: '스마트폰 메시지' 연습기 (Smartphone Simulator)
   ========================================================================== */

let phoneMissionStep = 1;
const testMessageOptions = ['오늘 루먼픽 최고였단다! 🧡', '밥 든든하게 먹으렴 🍚', '오늘 날씨 좋네 ☀️'];
let selectedMessage = '';

function resetPhoneMission() {
  phoneMissionStep = 1;
  selectedMessage = '';
  
  const phoneChatBody = document.getElementById('phoneChatBody');
  if (!phoneChatBody) return;
  
  phoneChatBody.innerHTML = `
    <div class="chat-date font-small">2026년 6월 2일 화요일</div>
    <div class="chat-bubble received">
      <div class="bubble-sender">아들 🧑‍🦱</div>
      <div class="bubble-content font-medium">엄마, 오늘 루먼픽 학교 첫날인데 공부는 어떠셨어요? 😊</div>
    </div>
  `;

  updatePhoneMissionUI();
}

function updatePhoneMissionUI() {
  const missionBox = document.getElementById('missionBox');
  const phoneInputArea = document.getElementById('phoneInputArea');
  if (!missionBox || !phoneInputArea) return;

  if (phoneMissionStep === 1) {
    missionBox.innerHTML = `
      <div class="mission-title font-medium">💡 1단계 (메시지 창 열기)</div>
      <div class="mission-text font-large highlight-text" id="missionText">아들의 문자에 답장하기 위해 [메시지 입력창 💬]을 가볍게 눌러보세요!</div>
    `;
    phoneInputArea.innerHTML = `
      <button class="phone-text-input font-medium" onclick="advancePhoneMission(2)">
        여기를 눌러 메시지를 입력하세요... 💬
      </button>
    `;
  } 
  else if (phoneMissionStep === 2) {
    missionBox.innerHTML = `
      <div class="mission-title font-medium">💡 2단계 (답장 내용 고르기)</div>
      <div class="mission-text font-large highlight-text" id="missionText">자녀에게 보낼 가장 따뜻한 메시지 중 하나를 손가락으로 골라보세요!</div>
    `;
    
    let btnHtml = '<div class="phone-choice-grid">';
    testMessageOptions.forEach((option, idx) => {
      btnHtml += `<button class="phone-choice-btn font-medium" onclick="selectPhoneMessage('${option}')">${option}</button>`;
    });
    btnHtml += '</div>';
    phoneInputArea.innerHTML = btnHtml;
  } 
  else if (phoneMissionStep === 3) {
    missionBox.innerHTML = `
      <div class="mission-title font-medium">💡 3단계 (메시지 전송하기)</div>
      <div class="mission-text font-large" id="missionText">
        작성된 내용: <strong class="color-mint">"${selectedMessage}"</strong><br>
        이제 아래의 🧡 <strong class="highlight-text">[전송하기]</strong> 버튼을 꾹 누르세요!
      </div>
    `;
    phoneInputArea.innerHTML = `
      <button class="phone-action-btn pulse-animation font-large" onclick="advancePhoneMission(4)">
        📤 전송하기
      </button>
    `;
  } 
  else if (phoneMissionStep === 4) {
    missionBox.innerHTML = `
      <div class="mission-title font-medium text-center" style="color: var(--color-green-tag)">🎉 축하합니다! 전송 성공</div>
      <div class="mission-text font-medium text-center">
        자녀분께 문자 메시지를 무사히 보냈습니다!<br>
        실제 스마트폰도 이와 똑같이 전송하실 수 있어요.
      </div>
    `;
    phoneInputArea.innerHTML = `
      <button class="phone-action-btn font-large" style="background-color: var(--color-green-tag)" onclick="resetPhoneMission()">
        🔄 한 번 더 연습하기
      </button>
    `;
  }
}

function advancePhoneMission(nextStep) {
  phoneMissionStep = nextStep;
  
  if (phoneMissionStep === 2) {
    speakText("잘하셨습니다! 이제 화면 아래에서 자녀에게 보낼 문자 내용을 하나 선택해 보세요.");
  }
  
  if (phoneMissionStep === 4) {
    const phoneChatBody = document.getElementById('phoneChatBody');
    const myBubble = document.createElement('div');
    myBubble.classList.add('chat-bubble', 'sent');
    myBubble.innerHTML = `
      <div class="bubble-content font-medium">${selectedMessage}</div>
    `;
    phoneChatBody.appendChild(myBubble);
    
    setTimeout(() => {
      const childReaction = document.createElement('div');
      childReaction.classList.add('chat-bubble', 'received');
      childReaction.innerHTML = `
        <div class="bubble-sender">아들 🧑‍🦱</div>
        <div class="bubble-content font-medium">우와 엄마! 문자 너무 감사해요! 루먼픽 학교 짱인데요! 💕🥰</div>
      `;
      phoneChatBody.appendChild(childReaction);
      phoneChatBody.scrollTop = phoneChatBody.scrollHeight;
      speakText("축하합니다! 스마트폰으로 문자 전송 연습을 성공적으로 마치셨습니다. 참 잘하셨어요!");
    }, 600);

    setTimeout(() => {
      phoneChatBody.scrollTop = phoneChatBody.scrollHeight;
    }, 100);
  }

  updatePhoneMissionUI();
}

function selectPhoneMessage(message) {
  selectedMessage = message;
  speakText(`"${message}" 를 선택하셨습니다. 이제 전송 버튼을 눌러보세요.`);
  advancePhoneMission(3);
}


/* ==========================================================================
   6. 💬 말벗 도우미 챗봇 (Empathetic Senior-Friendly Chatbot)
   ========================================================================== */

function toggleChatbot() {
  const windowEl = document.getElementById('chatbotWindow');
  windowEl.classList.toggle('active');
  
  if (windowEl.classList.contains('active')) {
    speakText("안녕하세요 어르신! 루먼픽 말벗 챗봇 도우미입니다. 궁금하신 내용을 아래 버튼에서 골라보세요.");
    const msgBody = document.getElementById('chatbotMessages');
    msgBody.scrollTop = msgBody.scrollHeight;
  }
}

function handleChatbotQuery(type, userQuestion) {
  const messagesContainer = document.getElementById('chatbotMessages');
  
  const userBubble = document.createElement('div');
  userBubble.classList.add('chat-bubble', 'sent');
  userBubble.innerHTML = `<div class="bubble-content font-medium">${userQuestion}</div>`;
  messagesContainer.appendChild(userBubble);
  
  const quickActions = document.getElementById('chatbotQuickActions');
  quickActions.style.pointerEvents = 'none';
  quickActions.style.opacity = '0.6';

  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  setTimeout(() => {
    let chatbotAnswer = '';
    
    switch (type) {
      case 1:
        chatbotAnswer = `어르신, 저희 루먼픽은 어렵고 귀찮은 인터넷 가입 절차가 아예 없습니다!<br><br>
        화면에 있는 📞 <strong>[간편 상담 신청]</strong>에 성함과 연락처만 적어주시거나, <strong>1588-0000</strong>으로 직접 전화를 걸어주시면 친절한 파트너들이 말로써 간단하게 가입을 전부 대행해 드리니 안심하세요. 👵`;
        break;
      case 2:
        chatbotAnswer = `수업 비용은 너무 걱정 마세요!<br><br>
        루먼픽의 5대 주요 교육 프로그램은 <strong>국가 지자체 및 시니어 교육 지원 기금의 전폭적인 후원을 받기 때문에 전액 100% 무료 강좌</strong>로 상당수 편성되어 운영 중입니다. 언제든 부담 없이 신청해 주세요! 🌸`;
        break;
      case 3:
        chatbotAnswer = `가장 소중한 준비물은 딱 하나, <strong>'오늘 하루 즐겁게 배우겠다는 미소'</strong>뿐입니다!<br><br>
        필기도구, 종이 교재, 인지 발달 퍼즐 교구와 교육용 디지털 스마트 기기까지 학습에 필요한 모든 용품은 루먼픽 강의실에 풍족하게 준비해 두었습니다. 가벼운 마음으로 빈손으로 찾아와 차 한잔하며 시작하시면 됩니다. 🍵`;
        break;
      case 4:
        chatbotAnswer = `역시 친근한 목소리로 말로 물어보는 1:1 상담이 가장 좋고 명확합니다! 👍<br><br>
        루먼픽 직통 전화번호 ☎️ <strong>1588-0000</strong> 으로 전화를 걸어주시면 어르신 맞춤 상담사와 즉시 따뜻한 전화 통화가 연결됩니다. (스마트폰 사용자이시라면 화면 맨 아래에 위치한 전화번호를 꾹 터치하시는 것만으로 통화 연결이 됩니다.)`;
        break;
      default:
        chatbotAnswer = "어르신, 무엇이든 쉽고 다정하게 설명해 드리겠습니다. 편안하게 물어보세요!";
    }

    const botBubble = document.createElement('div');
    botBubble.classList.add('chat-bubble', 'received');
    botBubble.innerHTML = `
      <div class="bubble-sender">배움 도우미 👵</div>
      <div class="bubble-content font-medium">${chatbotAnswer}</div>
    `;
    messagesContainer.appendChild(botBubble);
    
    quickActions.style.pointerEvents = 'auto';
    quickActions.style.opacity = '1';

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chatbotAnswer;
    const plainText = tempDiv.textContent || tempDiv.innerText;
    speakText(plainText);

  }, 800);
}


/* ==========================================================================
   7. 모달 제어 및 간편 양식 (Modal & Contact Form Controls)
   ========================================================================== */

function openHelpModal() {
  const modal = document.getElementById('helpModal');
  modal.classList.add('active');
  speakText("루먼픽 홈페이지 쉬운 설명서가 열렸습니다. 큰 글씨 확대 기능, 🔊 음성 읽어주기 기능, 고대비 밤 화면 전환에 대해 차례로 가이드해 드립니다.");
}

function closeHelpModal() {
  const modal = document.getElementById('helpModal');
  modal.classList.remove('active');
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
}

function showSuccessModal() {
  const modal = document.getElementById('gameSuccessModal');
  modal.classList.add('active');
  speakText("축하합니다! 참 잘하셨어요! 카드를 모두 맞추어 뇌가 아주 생생해졌습니다.");
}

function closeSuccessModal() {
  const modal = document.getElementById('gameSuccessModal');
  modal.classList.remove('active');
}

function scrollToExperience(type) {
  const target = document.getElementById(type === 'memory' ? 'memory-game-section' : 'smartphone-section');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
    target.style.outline = '4px solid var(--color-mint)';
    setTimeout(() => {
      target.style.outline = 'none';
    }, 1500);
  }
}

function handleContactSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('userName').value.trim();
  const phone = document.getElementById('userPhone').value.trim();
  const agree = document.getElementById('privacyAgree').checked;

  if (!name || !phone || !agree) {
    alert("성함과 전화번호를 입력하시고 안심 서약에 동의해 주세요.");
    return;
  }

  document.getElementById('quickContactForm').classList.add('d-none');
  document.getElementById('contactSuccessMsg').classList.remove('d-none');
  
  speakText(`${name} 어르신, 상담 접수가 안전하게 완료되었습니다! 남겨주신 전화번호 ${phone}으로 정성이 담긴 친절한 안내 전화를 조속히 올리겠습니다. 편안한 하루 되세요.`);
}

function resetContactForm() {
  document.getElementById('quickContactForm').reset();
  document.getElementById('quickContactForm').classList.remove('d-none');
  document.getElementById('contactSuccessMsg').classList.add('d-none');
}
