const fs = require('fs');
const https = require('https');

const url = 'https://cdn.discordapp.com/attachments/1225113335947857920/1228384818497327124/image.png?ex=69b2ed02&is=69b19b82&hm=459b7ce2c82e6d63c4e97607771746973950d24c0d0267c79e607e6005d5418b&';
const path = 'c:/Users/Dario/antigravity/ejercicios-tl-antigravity/public/scalping-eurnzd.png';

const file = fs.createWriteStream(path);
https.get(url, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Download completed');
  });
}).on('error', (err) => {
  fs.unlink(path);
  console.error('Error: ' + err.message);
});
