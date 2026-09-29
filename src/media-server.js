const { SMTCMonitor } = require('@coooookies/windows-smtc-monitor');

async function pollMediaData() {
  let mediaData = {
    title: 'No Media Playing',
    artist: '',
    albumArt: '',
    status: 'Stopped'
  };

  try {
    const sessions = await SMTCMonitor.getMediaSessions();
    if (sessions && sessions.length > 0) {
      // 4 = Playing, 5 = Paused
      let activeSession = sessions.find(s => s.playback && s.playback.playbackStatus === 4);
      if (!activeSession) activeSession = sessions[0];

      if (activeSession) {
        let base64Art = '';
        if (activeSession.media.thumbnail) {
           const buf = Buffer.isBuffer(activeSession.media.thumbnail) 
               ? activeSession.media.thumbnail 
               : Buffer.from(activeSession.media.thumbnail);
           const isPng = buf[0] === 137 && buf[1] === 80;
           base64Art = `data:image/${isPng ? 'png' : 'jpeg'};base64,${buf.toString('base64')}`;
        }

        mediaData = {
          title: activeSession.media.title || 'Unknown Title',
          artist: activeSession.media.artist || 'Unknown Artist',
          albumArt: base64Art, 
          status: activeSession.playback ? activeSession.playback.playbackStatus : 3,
          position: activeSession.timeline ? activeSession.timeline.position : 0,
          duration: activeSession.timeline ? activeSession.timeline.duration : 1,
          appId: activeSession.sourceAppId || ''
        };
      }
    }
  } catch (err) {
    mediaData.title = 'Error fetching media';
    mediaData.artist = err.message || '';
  }

  if (process.send) {
    process.send(mediaData);
  }
}

setInterval(pollMediaData, 500);
pollMediaData();
