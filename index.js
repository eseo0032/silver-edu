/* ==========================================================================
   실버 배움터 (Silver Academy) - 맞춤형 인터랙션 스크립트
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 웹페이지 로드 시 초기 설정 실행
  initMemoryGame();
  resetPhoneMission();
  
  // 모달 외부 클릭 시 닫기 이벤트 등록
  window.onclick = function(event) {
    const helpModal = document.getElementById('helpModal');
    const successModal = document.getElementById('gameSuccessModal');
    if (event.target === helpModal) {
      closeHelpModal();
    }
    if (event.target === successModal) {
      closeSuccessModal();
    }
  };
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
  
  // 모든 텍스트 조절 버튼 비활성화
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
  
  // CSS 변수 갱신
  htmlElement.style.setProperty('--font-scale', scale);
  
  // 스크린리더 음성 피드백
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
  // 이미 재생 중이면 멈추기 (한 번 더 누르면 토글처럼 정지함)
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    // 현재 말하던 내용을 다시 누른 경우 완전 멈추고 종료
    if (currentUtterance && currentUtterance.text === text) {
      currentUtterance = null;
      return;
    }
  }

  // 어르신용이므로 천천히, 다정한 속도 설정 (0.8 ~ 0.85 배속)
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.82; 
  utterance.pitch = 1.0; 

  // 한국어 목소리 설정 최적화
  const voices = window.speechSynthesis.getVoices();
  const koreanVoice = voices.find(voice => voice.lang.includes('ko-KR'));
  if (koreanVoice) {
    utterance.voice = koreanVoice;
  }

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}


/* ==========================================================================
   3. 🧠 체험존 1: '두뇌 생생' 카드 매칭 게임 (Memory Game Engine)
   ========================================================================== */

const memoryEmojis = ['🍎', '🌟', '🧡', '🎸', '🍎', '🌟', '🧡', '🎸'];
let flippedCards = [];
let matchedPairs = 0;
let isBoardLocked = false;

/**
 * 인지능력 카드 매칭 보드 초기화
 */
function initMemoryGame() {
  const cardBoard = document.getElementById('cardBoard');
  cardBoard.innerHTML = '';
  flippedCards = [];
  matchedPairs = 0;
  isBoardLocked = false;
  document.getElementById('flipScore').textContent = '0';

  // 카드 랜덤하게 섞기 (피셔-예이츠 알고리즘)
  const shuffled = [...memoryEmojis];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 카드 돔 요소 생성
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

/**
 * 카드를 클릭하여 뒤집었을 때 동작하는 메인 핸들러
 */
function handleCardFlip(card) {
  // 동작 방지 예외 처리
  if (isBoardLocked || card.classList.contains('flipped') || card.classList.contains('matched')) {
    return;
  }

  // 카드 뒤집기 애니메이션 적용
  card.classList.add('flipped');
  card.setAttribute('aria-label', `카드 공개: ${card.dataset.emoji}`);
  flippedCards.push(card);

  // 2개의 카드가 선택되었을 때 일치 여부 비교
  if (flippedCards.length === 2) {
    checkCardMatch();
  }
}

/**
 * 뒤집힌 두 장의 카드가 일치하는지 비교합니다.
 */
function checkCardMatch() {
  isBoardLocked = true;
  const [card1, card2] = flippedCards;

  if (card1.dataset.emoji === card2.dataset.emoji) {
    // 짝이 맞는 경우
    setTimeout(() => {
      card1.classList.add('matched');
      card2.classList.add('matched');
      card1.setAttribute('aria-label', `짝을 맞춘 카드: ${card1.dataset.emoji}`);
      card2.setAttribute('aria-label', `짝을 맞춘 카드: ${card2.dataset.emoji}`);
      
      matchedPairs++;
      document.getElementById('flipScore').textContent = matchedPairs;
      flippedCards = [];
      isBoardLocked = false;

      // 축하 피드백 음성 안내
      speakText("맞췄습니다! 참 잘하셨어요.");

      // 전체 다 맞춘 경우 (총 4쌍)
      if (matchedPairs === 4) {
        setTimeout(showSuccessModal, 600);
      }
    }, 400);
  } else {
    // 짝이 맞지 않는 경우 다시 원래대로 뒤집기
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

/**
 * 카드 게임을 다시 처음부터 리셋합니다.
 */
function restartMemoryGame() {
  initMemoryGame();
  speakText("두뇌 게임 카드가 새롭게 섞였습니다. 다시 시작해 보세요!");
}


/* ==========================================================================
   4. 📱 체험존 2: '스마트폰 메시지' 연습기 (Smartphone Simulator)
   ========================================================================== */

let phoneMissionStep = 1;
const testMessageOptions = ['엄마도 보고 싶다! 🧡', '밥 든든하게 먹으렴 🍚', '오늘 날씨 좋네 ☀️'];
let selectedMessage = '';

/**
 * 스마트폰 미션을 초기 상태로 리셋합니다.
 */
function resetPhoneMission() {
  phoneMissionStep = 1;
  selectedMessage = '';
  
  // 채팅창 내용 초기화 (기본 대화만 수록)
  const phoneChatBody = document.getElementById('phoneChatBody');
  phoneChatBody.innerHTML = `
    <div class="chat-date font-small">2026년 6월 2일 화요일</div>
    <div class="chat-bubble received">
      <div class="bubble-sender">아들 🧑‍🦱</div>
      <div class="bubble-content font-medium">엄마, 오늘 날씨 좋은데 기분은 어떠세요? 😊</div>
    </div>
  `;

  // 미션 및 입력창 초기화
  updatePhoneMissionUI();
}

/**
 * 현재 단계에 맞춰 스마트폰 시뮬레이터의 UI 구조를 업데이트합니다.
 */
function updatePhoneMissionUI() {
  const missionBox = document.getElementById('missionBox');
  const missionText = document.getElementById('missionText');
  const phoneInputArea = document.getElementById('phoneInputArea');

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
    
    // 메시지 버튼 3개 렌더링
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

/**
 * 스마트폰 연습 단계 진행
 * @param {number} nextStep 
 */
function advancePhoneMission(nextStep) {
  phoneMissionStep = nextStep;
  
  if (phoneMissionStep === 2) {
    speakText("잘하셨습니다! 이제 화면 아래에서 자녀에게 보낼 문자 내용을 하나 선택해 보세요.");
  }
  
  if (phoneMissionStep === 4) {
    // 채팅창에 내 대화 말풍선 추가
    const phoneChatBody = document.getElementById('phoneChatBody');
    const myBubble = document.createElement('div');
    myBubble.classList.add('chat-bubble', 'sent');
    myBubble.innerHTML = `
      <div class="bubble-content font-medium">${selectedMessage}</div>
    `;
    phoneChatBody.appendChild(myBubble);
    
    // 자녀의 즐거운 대답 풍선 추가 (0.6초 뒤 리액션)
    setTimeout(() => {
      const childReaction = document.createElement('div');
      childReaction.classList.add('chat-bubble', 'received');
      childReaction.innerHTML = `
        <div class="bubble-sender">아들 🧑‍🦱</div>
        <div class="bubble-content font-medium">우와 엄마! 문자 너무 감사해요! 사랑해요!! 💕🥰</div>
      `;
      phoneChatBody.appendChild(childReaction);
      // 채팅창 스크롤 하단 고정
      phoneChatBody.scrollTop = phoneChatBody.scrollHeight;
      speakText("축하합니다! 스마트폰으로 문자 전송 연습을 성공적으로 마치셨습니다. 참 잘하셨어요!");
    }, 600);

    // 스크롤 동기화
    setTimeout(() => {
      phoneChatBody.scrollTop = phoneChatBody.scrollHeight;
    }, 100);
  }

  updatePhoneMissionUI();
}

/**
 * 2단계에서 메시지를 선택했을 때 호출됩니다.
 * @param {string} message 
 */
function selectPhoneMessage(message) {
  selectedMessage = message;
  speakText(`"${message}" 를 선택하셨습니다. 이제 전송 버튼을 눌러보세요.`);
  advancePhoneMission(3);
}


/* ==========================================================================
   5. 💬 말벗 도우미 챗봇 (Empathetic Senior-Friendly Chatbot)
   ========================================================================== */

/**
 * 우측 하단의 챗봇 대화창을 열고 닫습니다.
 */
function toggleChatbot() {
  const windowEl = document.getElementById('chatbotWindow');
  windowEl.classList.toggle('active');
  
  if (windowEl.classList.contains('active')) {
    speakText("안녕하세요 어르신! 따뜻한 말벗 챗봇 도우미입니다. 궁금하신 내용을 아래 버튼에서 골라보세요.");
    // 챗봇 대화방 하단 스크롤 동기화
    const msgBody = document.getElementById('chatbotMessages');
    msgBody.scrollTop = msgBody.scrollHeight;
  }
}

/**
 * 챗봇 질문 버튼 클릭 시 대화를 시뮬레이션합니다.
 * @param {number} type - 질문 항목 번호
 * @param {string} userQuestion - 유저가 클릭한 한글 질문
 */
function handleChatbotQuery(type, userQuestion) {
  const messagesContainer = document.getElementById('chatbotMessages');
  
  // 1. 유저 질문 추가
  const userBubble = document.createElement('div');
  userBubble.classList.add('chat-bubble', 'sent');
  userBubble.innerHTML = `<div class="bubble-content font-medium">${userQuestion}</div>`;
  messagesContainer.appendChild(userBubble);
  
  // 챗봇의 빠른 터치 차단용
  const quickActions = document.getElementById('chatbotQuickActions');
  quickActions.style.pointerEvents = 'none';
  quickActions.style.opacity = '0.6';

  // 즉각 스크롤
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // 2. 챗봇의 친절하고 상세한 어조의 대답 추가 (0.8초 후)
  setTimeout(() => {
    let chatbotAnswer = '';
    
    switch (type) {
      case 1: // 회원가입
        chatbotAnswer = `어르신, 저희 실버 배움터는 인터넷으로 귀찮고 복잡한 가입 신청서 작성을 전혀 시키지 않습니다!<br><br>
        화면에 있는 📞 <strong>[간편 상담 신청]</strong>에 성함과 연락처만 적어주시거나, <strong>1588-0000</strong>으로 직접 전화를 걸어주시면 전문 배움 지도사들이 말로써 친절하게 가입 및 모든 접수를 도와드리니 걱정 마세요. 👵`;
        break;
      case 2: // 수업 비용
        chatbotAnswer = `돈 걱정은 편안하게 접어두셔도 괜찮습니다!<br><br>
        실버 배움터가 제공하는 스마트폰 기초, 생활 스트레칭, 치매 예방 인지 퍼즐 등 대부분의 기본 교육은 <strong>국가/구청 및 복지관의 전폭적인 지원을 받아 100% 무료</strong>로 마음껏 이용하실 수 있습니다. 🌸`;
        break;
      case 3: // 공부 준비물
        chatbotAnswer = `어르신께서 공부하러 오실 때 챙기실 준비물은 딱 하나, <strong>'새로운 배움을 즐기고자 하는 활기찬 마음'</strong>뿐입니다!<br><br>
        공부에 필요한 연필, 종합 교재, 물감 세트와 스마트 교육용 태블릿 PC까지 모든 장비와 학용품은 저희 배움터 교실에 전부 든든하게 준비해두었답니다. 편하게 빈손으로 찾아와 차 한잔하며 시작하세요. 🍵`;
        break;
      case 4: // 바로 전화
        chatbotAnswer = `그렇지요! 글자를 누르는 것보다 친근하게 말로 나누는 목소리 상담이 최고입니다. 👍<br><br>
        어르신 전용 무료 연락처 ☎️ <strong>1588-0000</strong> 으로 전화를 걸어주시면 대기 시간 없이 따뜻하고 친절한 상담원과 바로 연결됩니다. (스마트폰이시라면 화면 맨 아래의 <strong>[☎️ 1588-0000]</strong> 번호를 꾹 누르시면 즉시 전화 통화로 넘어갑니다.)`;
        break;
      default:
        chatbotAnswer = "어르신, 무엇이든 다정하게 설명해 드리겠습니다. 편안하게 여쭤보세요!";
    }

    const botBubble = document.createElement('div');
    botBubble.classList.add('chat-bubble', 'received');
    botBubble.innerHTML = `
      <div class="bubble-sender">배움 도우미 👵</div>
      <div class="bubble-content font-medium">${chatbotAnswer}</div>
    `;
    messagesContainer.appendChild(botBubble);
    
    // 원복
    quickActions.style.pointerEvents = 'auto';
    quickActions.style.opacity = '1';

    // 최하단 스크롤
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // 챗봇 대답 🔊 음성 리딩
    // 태그를 제외한 텍스트만 추출해서 음성 출력
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chatbotAnswer;
    const plainText = tempDiv.textContent || tempDiv.innerText;
    speakText(plainText);

  }, 800);
}


/* ==========================================================================
   6. 모달 제어 및 간편 양식 (Modal & Contact Form Controls)
   ========================================================================== */

/**
 * 홈페이지 쉬운 설명서 열기
 */
function openHelpModal() {
  const modal = document.getElementById('helpModal');
  modal.classList.add('active');
  speakText("홈페이지 쉬운 설명서가 열렸습니다. 큰 글씨를 보시거나, 음성 듣기 기능, 고대비 어두운 모드를 어떻게 사용하는지 차례로 알려드립니다.");
}

/**
 * 홈페이지 쉬운 설명서 닫기
 */
function closeHelpModal() {
  const modal = document.getElementById('helpModal');
  modal.classList.remove('active');
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
}

/**
 * 게임 성공 모달 열기
 */
function showSuccessModal() {
  const modal = document.getElementById('gameSuccessModal');
  modal.classList.add('active');
  speakText("축하합니다! 참 잘하셨어요! 카드를 모두 맞추어 뇌가 아주 생생해졌습니다.");
}

/**
 * 게임 성공 모달 닫기
 */
function closeSuccessModal() {
  const modal = document.getElementById('gameSuccessModal');
  modal.classList.remove('active');
}

/**
 * 특정 체험으로 부드럽게 스크롤하며 포커스를 동기화합니다.
 * @param {string} type - 'memory' 또는 'smartphone'
 */
function scrollToExperience(type) {
  const target = document.getElementById(type === 'memory' ? 'memory-game-section' : 'smartphone-section');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
    // 시각적 강조
    target.style.outline = '4px solid var(--color-mint)';
    setTimeout(() => {
      target.style.outline = 'none';
    }, 1500);
  }
}

/**
 * 간편 신청 양식 접수 핸들러
 */
function handleContactSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('userName').value.trim();
  const phone = document.getElementById('userPhone').value.trim();
  const agree = document.getElementById('privacyAgree').checked;

  if (!name || !phone || !agree) {
    alert("성함과 전화번호를 정확히 기재하시고 안심 서약에 체크해 주세요.");
    return;
  }

  // 폼 숨기기 및 성공 카드 출력
  document.getElementById('quickContactForm').classList.add('d-none');
  document.getElementById('contactSuccessMsg').classList.remove('d-none');
  
  // 성공 멘트 낭독
  speakText(`${name} 어르신, 상담 전화 접수가 안전하게 잘 끝났습니다! 입력해주신 번호 ${phone}으로 마음 따뜻하고 친절하게 대기 시간 없이 전화해 드릴게요. 감사합니다.`);
}

/**
 * 상담 신청 완료 후 재신청 폼 리셋
 */
function resetContactForm() {
  document.getElementById('quickContactForm').reset();
  document.getElementById('quickContactForm').classList.remove('d-none');
  document.getElementById('contactSuccessMsg').classList.add('d-none');
}
