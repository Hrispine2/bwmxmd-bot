const { bwmxmd } = require('../adams/commandHandler');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');
const mime = require('mime-types');

const CLOUD_NAME = 'dqxlb29uz';
const UPLOAD_PRESET = 'bwm_avatars';

const getContactMsg = (contactName, sender) => {
  const XMD = require('../adams/xmd');
  return XMD.getContactMsg(contactName, sender);
};

function getMediaType(quoted) {
  if (quoted.imageMessage) return "image";
  if (quoted.videoMessage) return "video";
  if (quoted.stickerMessage) return "sticker";
  if (quoted.audioMessage) return "audio";
  return "unknown";
}

async function saveMediaToTemp(client, quotedMedia, type) {
  const tmpDir = path.join(__dirname, "..", "tmp");
  await fs.ensureDir(tmpDir);
  const fileName = `${type}-${Date.now()}`;
  const filePath = path.join(tmpDir, fileName);
  const savedPath = await client.downloadAndSaveMediaMessage(quotedMedia, filePath);
  return savedPath;
}

async function uploadToCloudinary(filePath, mediaType) {
  const buffer = await fs.readFile(filePath);
  const contentType = mime.lookup(path.extname(filePath)) || 'application/octet-stream';

  let resourceType = 'raw';
  if (mediaType === 'image' || mediaType === 'sticker') resourceType = 'image';
  else if (mediaType === 'video') resourceType = 'video';

  const form = new FormData();
  form.append('file', buffer, {
    filename: path.basename(filePath),
    contentType
  });
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', 'bwm_uploads');
  form.append('public_id', `media-${Date.now()}`);

  const { data } = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    form,
    {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 60000
    }
  );

  if (!data?.secure_url) throw new Error('Cloudinary did not return a URL');
  return data.secure_url;
}

bwmxmd({
  pattern: "url",
  aliases: ["upload", "urlconvert"],
  description: "Convert quoted media to a hosted URL",
  category: "Uploader",
  filename: __filename
}, async (from, client, conText) => {
  const { mek, quoted, quotedMsg, reply } = conText;

  if (!quotedMsg) return reply("📌 Please quote an image, video, audio, or sticker to upload.");

  const type = getMediaType(quotedMsg);
  if (type === "unknown") return reply("❌ Unsupported media type.");

  const mediaNode =
    quoted?.imageMessage ||
    quoted?.videoMessage ||
    quoted?.audioMessage ||
    quoted?.stickerMessage;

  if (!mediaNode) return reply("❌ Could not extract media content.");

  let filePath;
  try {
    await reply("⏳ Uploading...");
    filePath = await saveMediaToTemp(client, mediaNode, type);
    const link = await uploadToCloudinary(filePath, type);
    await client.sendMessage(from, { text: link }, { quoted: mek });
  } catch (err) {
    console.error("Upload error:", err);
    await reply("❌ Failed to upload. Error:\n" + err.message);
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { console.error("unlink error:", e); }
    }
  }
});
