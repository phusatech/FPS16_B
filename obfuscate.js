const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const glob = require('glob');

// Lấy danh sách tất cả các file .js trong thư mục hiện tại
const files = glob.sync('**/*.js', { 
    ignore: ['node_modules/**', 'obfuscate.js'] // Bỏ qua node_modules và chính file này
});

console.log("Đang bắt đầu làm rối mã nguồn...");

files.forEach(file => {
    const code = fs.readFileSync(file, 'utf8');
    
    // Cấu hình làm rối
    const obfuscatedCode = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true, // Xáo trộn luồng logic
        deadCodeInjection: true,     // Chèn code rác
        stringArray: true            // Mã hóa các chuỗi ký tự
    }).getObfuscatedCode();

    fs.writeFileSync(file, obfuscatedCode);
    console.log(`Đã xong: ${file}`);
});

console.log("Hoàn tất! Dự án của bạn đã được bảo vệ.");