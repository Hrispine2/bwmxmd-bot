const { bwmxmd } = require('../adams/commandHandler');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');
const XMD = require('../adams/xmd');
const ffmpegPath = require('ffmpeg-static');

const getContactMsg = (contactName, sender) => XMD.getContactMsg(contactName, sender);

const ffmpeg = (args) => `"${ffmpegPath}" ${args}`;

//========================================================================================================================

bwmxmd({
  pattern: "trim",
  description: "Trim quoted audio or video using start and end time",
  category: "Utility",
  filename: __filename
}, async (from, client, conText) => {
  const { quotedMsg, q, mek, reply } = conText;

  if (!quotedMsg) {
    return reply("❌ Reply to an audio or video file with start and end time.\n\nExample: `trim 0:10 0:30`");
  }

  const [startTime, endTime] = q.split(" ").map(t => t.trim());
  if (!startTime || !endTime) {
    return reply("⚠️ Invalid format.\n\nExample: `trim 0:10 0:30`");
  }

  const mediaType = quotedMsg.audioMessage || quotedMsg.videoMessage;
  if (!mediaType) {
    return reply("❌ Unsupported media type. Quote an audio or video file.");
  }

  try {
    const mediaPath = await client.downloadAndSaveMediaMessage(mediaType);
    const isAudio = !!quotedMsg.audioMessage;
    const outputPath = `/tmp/trim_${Date.now()}${isAudio ? '.mp3' : '.mp4'}`;

    exec(ffmpeg(`-y -i "${mediaPath}" -ss ${startTime} -to ${endTime} -c copy "${outputPath}"`), async (err) => {
      try { fs.unlinkSync(mediaPath); } catch (e) {}
      if (err) {
        console.error("trim ffmpeg error:", err);
        return reply("❌ Trimming failed.");
      }

      const buffer = fs.readFileSync(outputPath);
      const message = isAudio
        ? { audio: buffer, mimetype: "audio/mpeg" }
        : { video: buffer, mimetype: "video/mp4" };

      await client.sendMessage(from, message, { quoted: mek });
      try { fs.unlinkSync(outputPath); } catch (e) {}
    });
  } catch (error) {
    console.error("trim error:", error);
    await reply("❌ An error occurred while processing the media.");
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "volume",
  description: "Adjust volume of quoted audio or video",
  category: "Utility",
  filename: __filename
}, async (from, client, conText) => {
  const { quotedMsg, q, mek, reply } = conText;

  if (!q) {
    return reply("⚠️ Example: volume 1.5");
  }

  const mediaType = quotedMsg?.audioMessage || quotedMsg?.videoMessage;
  if (!mediaType) {
    return reply("❌ Quote an audio or video file to adjust its volume.");
  }

  try {
    const mediaPath = await client.downloadAndSaveMediaMessage(mediaType);
    const isAudio = !!quotedMsg.audioMessage;
    const outputPath = `/tmp/volume_${Date.now()}${isAudio ? '.mp3' : '.mp4'}`;

    exec(ffmpeg(`-y -i "${mediaPath}" -filter:a volume=${q} "${outputPath}"`), async (err) => {
      try { fs.unlinkSync(mediaPath); } catch (e) {}
      if (err) {
        console.error("volume ffmpeg error:", err);
        return reply("❌ Volume adjustment failed.");
      }

      const buffer = fs.readFileSync(outputPath);
      const message = isAudio
        ? { audio: buffer, mimetype: "audio/mpeg" }
        : { video: buffer, mimetype: "video/mp4" };

      await client.sendMessage(from, message, { quoted: mek });
      try { fs.unlinkSync(outputPath); } catch (e) {}
    });
  } catch (error) {
    console.error("volume error:", error);
    await reply("❌ An error occurred while processing the media.");
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "mp3",
  aliases: ["tomp3", "toaudio", "audioextract"],
  description: "Convert quoted audio or video to MP3",
  category: "Utility",
  filename: __filename
}, async (from, client, conText) => {
  const { quotedMsg, mek, reply } = conText;

  const mediaType = quotedMsg?.videoMessage || quotedMsg?.audioMessage;
  if (!mediaType) {
    return reply("❌ Quote an audio or video to convert to MP3.");
  }

  await reply("⏳ Converting to MP3...");

  try {
    const media = await client.downloadAndSaveMediaMessage(mediaType);
    const output = `/tmp/mp3_${Date.now()}.mp3`;

    exec(ffmpeg(`-y -i "${media}" -vn -acodec libmp3lame -q:a 2 "${output}"`), async (err) => {
      try { fs.unlinkSync(media); } catch (e) {}
      if (err) {
        console.error("mp3 ffmpeg error:", err);
        return reply("❌ Conversion failed.");
      }

      const buffer = fs.readFileSync(output);
      await client.sendMessage(from, {
        audio: buffer,
        mimetype: "audio/mpeg"
      }, { quoted: mek });

      try { fs.unlinkSync(output); } catch (e) {}
    });
  } catch (error) {
    console.error("mp3 error:", error);
    await reply("❌ An error occurred while converting.");
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "videomp3",
  aliases: ["vtomp3", "video2mp3", "videotomp3"],
  description: "Convert a quoted video to MP3 audio",
  category: "Utility",
  filename: __filename
}, async (from, client, conText) => {
  const { quotedMsg, mek, reply } = conText;

  if (!quotedMsg?.videoMessage) {
    return reply("❌ Reply to a video to convert it to MP3.");
  }

  await reply("⏳ Converting video to MP3...");

  try {
    const media = await client.downloadAndSaveMediaMessage(quotedMsg.videoMessage);
    const output = `/tmp/videomp3_${Date.now()}.mp3`;

    exec(ffmpeg(`-y -i "${media}" -vn -acodec libmp3lame -q:a 2 "${output}"`), async (err) => {
      try { fs.unlinkSync(media); } catch (e) {}
      if (err) {
        console.error("videomp3 ffmpeg error:", err);
        return reply("❌ Conversion failed. Make sure the video has an audio track.");
      }

      const buffer = fs.readFileSync(output);
      await client.sendMessage(from, {
        audio: buffer,
        mimetype: "audio/mpeg"
      }, { quoted: mek });

      try { fs.unlinkSync(output); } catch (e) {}
    });
  } catch (error) {
    console.error("videomp3 error:", error);
    await reply("❌ An error occurred while converting the video.");
  }
});
//========================================================================================================================

bwmxmd({
  pattern: "toimg",
  aliases: ["sticker2img", "webp2png"],
  description: "Convert quoted sticker to image",
  category: "Utility",
  filename: __filename
}, async (from, client, conText) => {
  const { quotedMsg, mek, reply } = conText;

  if (!quotedMsg?.stickerMessage) {
    return reply("❌ Quote a sticker to convert.");
  }

  try {
    const media = await client.downloadAndSaveMediaMessage(quotedMsg.stickerMessage);
    const output = `/tmp/toimg_${Date.now()}.png`;

    exec(ffmpeg(`-y -i "${media}" "${output}"`), async (err) => {
      try { fs.unlinkSync(media); } catch (e) {}
      if (err) return reply("❌ Conversion failed.");

      const buffer = fs.readFileSync(output);
      await client.sendMessage(from, {
        image: buffer,
        caption: "🖼️ Converted from sticker"
      }, { quoted: mek });

      try { fs.unlinkSync(output); } catch (e) {}
    });
  } catch (e) {
    console.error("toimg error:", e);
    await reply("❌ Unable to convert the sticker.");
  }
});
//==================================================================================================================

bwmxmd({
  pattern: "amplify",
  aliases: ["replaceaudio", "mergeaudio"],
  description: "Replace quoted video's audio with a new audio URL",
  category: "Utility",
  filename: __filename
}, async (from, client, conText) => {
  const { quotedMsg, q, mek, reply } = conText;

  if (!quotedMsg?.videoMessage) {
    return reply("❌ Reply to a video file with the audio URL to replace its audio.");
  }

  if (!q) {
    return reply("❌ Provide an audio URL.");
  }

  try {
    const audioUrl = q.trim();
    const media = await client.downloadAndSaveMediaMessage(quotedMsg.videoMessage);
    const ts = Date.now();
    const ext = audioUrl.split('.').pop().split('?')[0].toLowerCase() || 'mp3';
    const audioPath = `/tmp/amplify_audio_${ts}.${ext}`;
    const outputPath = `/tmp/amplify_out_${ts}.mp4`;

    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(audioPath, response.data);

    exec(ffmpeg(`-y -i "${media}" -i "${audioPath}" -c:v copy -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`), async (err) => {
      try { fs.unlinkSync(media); } catch (e) {}
      try { fs.unlinkSync(audioPath); } catch (e) {}
      if (err) {
        console.error("amplify ffmpeg error:", err);
        return reply("❌ Error during audio replacement.");
      }

      const videoBuffer = fs.readFileSync(outputPath);
      await client.sendMessage(from, {
        video: videoBuffer,
        mimetype: "video/mp4"
      }, { quoted: mek });

      try { fs.unlinkSync(outputPath); } catch (e) {}
    });
  } catch (error) {
    console.error("amplify error:", error);
    await reply("❌ An error occurred while processing the media.");
  }
});
