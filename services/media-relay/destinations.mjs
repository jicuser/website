// No shell interpolation and no arbitrary network destination from a browser request.
export function streamDestinations(values, allowed = {}) {
  if (!Array.isArray(values) || values.length < 1 || values.length > 2)
    throw new Error('Choose one or two destinations.');
  return values.map((item) => {
    if (
      !['youtube', 'tiktok'].includes(item?.platform) ||
      typeof item.url !== 'string' ||
      typeof item.key !== 'string' ||
      item.url.length > 2048 ||
      item.key.length > 1024 ||
      !item.key ||
      /[\s\x00-\x1f#]/.test(item.key)
    )
      throw new Error('Enter a valid stream server and key.');
    let url;
    try {
      url = new URL(item.url);
    } catch {
      throw new Error('Invalid stream server.');
    }
    if (
      !['rtmp:', 'rtmps:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.port && !['443', '1935'].includes(url.port))
    )
      throw new Error('Use an RTMP or RTMPS stream server without credentials.');
    if (!allowed[item.platform]?.includes(url.hostname.toLowerCase()))
      throw new Error('This stream hostname must be approved in the relay configuration.');
    // Stream keys remain in memory and process arguments, never in database records or logs.
    return `${url.href.replace(/\/$/, '')}/${item.key}`;
  });
}
export function encoderArgs(destinations) {
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-f', 'webm', '-i', 'pipe:0'];
  for (const url of destinations)
    args.push(
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-tune',
      'zerolatency',
      '-pix_fmt',
      'yuv420p',
      '-vf',
      'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
      '-r',
      '25',
      '-g',
      '50',
      '-b:v',
      '2500k',
      '-maxrate',
      '3000k',
      '-bufsize',
      '5000k',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '48000',
      '-f',
      'flv',
      '-flvflags',
      'no_duration_filesize',
      url,
    );
  return args;
}
