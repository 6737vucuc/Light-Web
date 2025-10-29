# Sound Files for Voice Calls

## Required Sound Files

Place the following audio files in this directory:

### 1. ringing.mp3
- **Purpose**: Plays when making an outgoing call (waiting for answer)
- **Duration**: 3-5 seconds (will loop)
- **Format**: MP3
- **Download**: You can use any phone ringing sound

### 2. incoming-call.mp3
- **Purpose**: Plays when receiving an incoming call
- **Duration**: 2-3 seconds (will loop)
- **Format**: MP3
- **Download**: You can use any notification sound

## Where to Get Free Sounds

### Option 1: Free Sound Libraries
- **Zapsplat**: https://www.zapsplat.com/sound-effect-category/phone-rings/
- **Freesound**: https://freesound.org/search/?q=phone+ring
- **Mixkit**: https://mixkit.co/free-sound-effects/phone/

### Option 2: Generate Using Online Tools
- **Beepbox**: https://www.beepbox.co/
- **Soundation**: https://soundation.com/

### Option 3: Use Default Browser Sounds
The app will work without custom sounds, but the experience will be better with them.

## File Specifications

```
public/sounds/
├── ringing.mp3          (outgoing call sound)
└── incoming-call.mp3    (incoming call notification)
```

## Testing

After adding the files, test by:
1. Starting a voice call
2. You should hear ringing.mp3
3. On the other device, you should hear incoming-call.mp3

## Notes

- Files should be small (< 100KB each) for fast loading
- MP3 format is supported by all modern browsers
- Sounds will auto-loop until call is answered/rejected
