const fs = require('fs');
const path = require('path');

const dir = __dirname;
const htmlFiles = ['app.html', 'dawngnhap.html', 'dangki.html', 'admin.html', 'admintongquan.html'];

if (!fs.existsSync(path.join(dir, 'css'))) fs.mkdirSync(path.join(dir, 'css'));
if (!fs.existsSync(path.join(dir, 'js'))) fs.mkdirSync(path.join(dir, 'js'));

htmlFiles.forEach(file => {
    let filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${file}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    let baseName = file.replace('.html', '');
    
    // Extract CSS
    let styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
    if(styleMatch) {
       let cssContent = styleMatch[1].trim();
       if (cssContent.length > 10) {
           fs.writeFileSync(path.join(dir, 'css', baseName + '.css'), cssContent);
           content = content.replace(styleMatch[0], `<link rel="stylesheet" href="css/global.css">\n    <link rel="stylesheet" href="css/${baseName}.css">`);
       }
    }

    // Extract JS
    let scriptRegex = /<script\s*>([\s\S]*?)<\/script>/g;
    let mainScript = "";
    
    content = content.replace(scriptRegex, (match, p1) => {
        mainScript += p1 + "\n\n";
        return '';
    });
    
    if(mainScript.trim().length > 10) {
       fs.writeFileSync(path.join(dir, 'js', baseName + '.js'), mainScript.trim());
       // Find closing body tag and inject script script tag right before it
       content = content.replace(/<\/body>/i, `    <script src="js/${baseName}.js"></script>\n</body>`);
    }

    fs.writeFileSync(filePath, content);
    console.log(`Processed ${file}`);
});
console.log("Refactoring complete!");
