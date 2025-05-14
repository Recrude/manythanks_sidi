// 스프레드시트 ID를 입력하세요
const SPREADSHEET_ID = '1IOHIcrfoqSCVufx7aNDTt3lHWKvZfiDqlpSlYC1qFv4';
const DEFAULT_SHEET_NAME = 'Comments'; // 기본 시트 이름


// 웹 앱으로 배포할 때 필요한 doGet, doPost 함수
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

// 요청 처리 함수
function handleRequest(e) {
  const params = e.parameter;
  const action = params.action;
  
  let result = {
    success: false,
    message: '알 수 없는 작업입니다.'
  };
  
  if (action === 'addComment') {
    result = addComment(params);
  } else if (action === 'getComments') {
    result = getComments(params);
  }
  
  // JSONP 지원을 위한 콜백 파라미터 확인
  const callback = params.callback;
  const jsonOutput = ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
  
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return jsonOutput;
  }
}

// 시트 이름 결정 함수
function getSheetName(params) {
  return params.sheet || DEFAULT_SHEET_NAME;
}

// 댓글 추가 함수
function addComment(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = getSheetName(params);
    let sheet = ss.getSheetByName(sheetName);
    
    // 시트가 없으면 새로 만들고 헤더 추가
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['타임스탬프', '이름', '메시지']);
    }
    
    // 댓글 데이터 추가
    const timestamp = params.timestamp || new Date().toISOString();
    const name = params.name || '익명';
    const message = params.message || '';
    
    sheet.appendRow([timestamp, name, message]);
    
    return {
      success: true,
      message: '댓글이 추가되었습니다.'
    };
  } catch (error) {
    return {
      success: false,
      message: '댓글 추가 중 오류가 발생했습니다: ' + error.toString()
    };
  }
}

// 댓글 가져오기 함수
function getComments(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = getSheetName(params);
    const sheet = ss.getSheetByName(sheetName);
    
    // 시트가 없으면 빈 배열 반환
    if (!sheet) {
      return {
        success: true,
        comments: []
      };
    }
    
    // 데이터 가져오기
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // 헤더 행 제외하고 댓글 데이터만 가져오기
    const comments = values.slice(1).map(row => {
      return {
        timestamp: row[0],
        name: row[1],
        message: row[2]
      };
    }).reverse(); // 최신 댓글이 먼저 표시되도록 역순 정렬
    
    return {
      success: true,
      comments: comments
    };
  } catch (error) {
    return {
      success: false,
      message: '댓글을 가져오는 중 오류가 발생했습니다: ' + error.toString(),
      comments: []
    };
  }
} 