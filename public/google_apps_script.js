/**
 * =========================================================================
 * Google Apps Script สำหรับระบบ รปภ. โรงพยาบาลพล (Phon Hospital Security)
 * หน้าที่: รับรูปภาพจากระบบ รปภ. ทุกประเภท แล้วบันทึกลงในโฟลเดอร์ Google Drive โดยตรง
 * โฟลเดอร์เป้าหมายหลัก: https://drive.google.com/drive/folders/1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT
 * =========================================================================
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var rootFolderId = data.folderId || "1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT";
    var rootFolder = DriveApp.getFolderById(rootFolderId);
    var targetFolder = rootFolder;
    
    // ค้นหาหรือสร้างโฟลเดอร์ย่อยตามประเภทรูป เช่น "ภาพถ่ายจุดตรวจ (Patrol Logs)", "รูปภาพเหตุการณ์ (Incidents)"
    if (data.subfolder) {
      var subfolders = rootFolder.getFoldersByName(data.subfolder);
      if (subfolders.hasNext()) {
        targetFolder = subfolders.next();
      } else {
        targetFolder = rootFolder.createFolder(data.subfolder);
      }
    }
    
    // แปลงข้อมูล Base64 เป็นไฟล์รูปภาพ
    var base64Data = (data.image || "").replace(/^data:image\/\w+;base64,/, "");
    var decoded = Utilities.base64Decode(base64Data);
    var filename = data.filename || ("photo_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss") + ".jpg");
    var blob = Utilities.newBlob(decoded, data.mimeType || "image/jpeg", filename);
    
    // บันทึกไฟล์ลง Google Drive และตั้งค่าสิทธิ์ให้เข้าถึงได้ผ่านลิงก์
    var file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: file.getId(),
      url: file.getUrl(),
      directLink: "https://lh3.googleusercontent.com/d/" + file.getId()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "Phon Hospital Security - Google Drive Image Webhook",
    rootFolderId: "1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT"
  })).setMimeType(ContentService.MimeType.JSON);
}
