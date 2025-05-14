// 스프레드시트 ID 설정
const SPREADSHEET_ID = '1IOHIcrfoqSCVufx7aNDTt3lHWKvZfiDqlpSlYC1qFv4';

/**
 * GET 요청 처리 함수
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * POST 요청 처리 함수
 */
function doPost(e) {
  return handleRequest(e);
}

/**
 * 모든 요청 처리 함수
 */
function handleRequest(e) {
  try {
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
    
    // JSONP 지원
    const callback = params.callback;
    const jsonOutput = ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return jsonOutput;
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: '오류가 발생했습니다: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 시트 이름 결정 함수
 */
function getSheetName(params) {
  // 파라미터에서 시트 이름을 가져오거나 기본값 사용
  const sheetName = params.sheet || 'Comments';
  
  // 디버깅을 위한 로그
  console.log('사용할 시트 이름: ' + sheetName);
  
  return sheetName;
}

/**
 * 댓글 추가 함수
 */
function addComment(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = getSheetName(params);
    let sheet = ss.getSheetByName(sheetName);
    
    // 시트가 없으면 새로 만들고 헤더 추가
    if (!sheet) {
      console.log('시트를 찾을 수 없어 새로 생성합니다: ' + sheetName);
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['타임스탬프', '이름', '메시지']);
    }
    
    // 댓글 데이터 추가
    const timestamp = params.timestamp || new Date().toISOString();
    const name = params.name || '익명';
    const message = params.message || '';
    
    console.log('댓글 추가: ' + name + ' - ' + sheetName);
    sheet.appendRow([timestamp, name, message]);
    
    return {
      success: true,
      message: '댓글이 성공적으로 추가되었습니다.',
      sheetName: sheetName  // 사용된 시트 이름 반환 (디버깅용)
    };
  } catch (error) {
    console.error('댓글 추가 오류: ' + error.toString());
    return {
      success: false,
      message: '댓글 추가 중 오류가 발생했습니다: ' + error.toString()
    };
  }
}

/**
 * 댓글 가져오기 함수
 */
function getComments(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = getSheetName(params);
    const sheet = ss.getSheetByName(sheetName);
    
    console.log('댓글 불러오기: ' + sheetName);
    
    // 시트가 없으면 빈 배열 반환
    if (!sheet) {
      console.log('시트를 찾을 수 없습니다: ' + sheetName);
      return {
        success: true,
        comments: [],
        sheetName: sheetName  // 사용된 시트 이름 반환 (디버깅용)
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
      comments: comments,
      sheetName: sheetName  // 사용된 시트 이름 반환 (디버깅용)
    };
  } catch (error) {
    console.error('댓글 불러오기 오류: ' + error.toString());
    return {
      success: false,
      message: '댓글을 가져오는 중 오류가 발생했습니다: ' + error.toString(),
      comments: []
    };
  }
} 