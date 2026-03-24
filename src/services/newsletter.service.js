import db from '../config/database.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import config from '../config/index.js';
import { sendEmail } from './email.service.js';

const TEMPLATES = {
  en: {
    welcome: {
      subject: 'Welcome to {{gymName}}!',
      body: `Hi {{memberName}},

Welcome to {{gymName}}! We're thrilled to have you as part of our fitness family.

Your membership is now active. Here's what you can do:
- Check in using the QR code on your phone
- Access all gym facilities during operating hours
- Track your attendance history

Let's crush those fitness goals together!

Best regards,
{{ownerName}}
{{gymName}}`,
    },
    renewal: {
      subject: 'Your {{gymName}} membership is expiring soon',
      body: `Hi {{memberName}},

This is a friendly reminder that your membership at {{gymName}} is expiring soon.

To continue enjoying uninterrupted access to our facilities, please renew your membership at the earliest.

Visit the gym or contact us to renew.

Stay fit!
{{ownerName}}
{{gymName}}`,
    },
    motivation: {
      subject: "Keep pushing! A message from {{gymName}}",
      body: `Hi {{memberName}},

We noticed you've been putting in great work at {{gymName}}! Keep it up!

Remember:
- Consistency beats intensity
- Every workout counts
- You're stronger than you think

See you at the gym!

{{ownerName}}
{{gymName}}`,
    },
  },
  hi: {
    welcome: {
      subject: '{{gymName}} में आपका स्वागत है!',
      body: `नमस्ते {{memberName}},

{{gymName}} में आपका स्वागत है! हमें खुशी है कि आप हमारे फिटनेस परिवार का हिस्सा बने।

आपकी सदस्यता अब सक्रिय है। आप यह कर सकते हैं:
- अपने फोन पर QR कोड से चेक-इन करें
- सभी जिम सुविधाओं का उपयोग करें
- अपनी उपस्थिति का इतिहास देखें

साथ मिलकर फिटनेस लक्ष्य हासिल करें!

शुभकामनाएं,
{{ownerName}}
{{gymName}}`,
    },
    renewal: {
      subject: '{{gymName}} की सदस्यता जल्द समाप्त हो रही है',
      body: `नमस्ते {{memberName}},

यह एक अनुस्मारक है कि {{gymName}} में आपकी सदस्यता जल्द समाप्त हो रही है।

निर्बाध सेवा के लिए कृपया जल्द से जल्द अपनी सदस्यता नवीनीकृत करें।

फिट रहें!
{{ownerName}}
{{gymName}}`,
    },
    motivation: {
      subject: '{{gymName}} से एक संदेश - हौसला रखें!',
      body: `नमस्ते {{memberName}},

{{gymName}} में आपकी मेहनत दिख रही है! ऐसे ही जारी रखें!

याद रखें:
- नियमितता तीव्रता से बेहतर है
- हर वर्कआउट मायने रखता है
- आप जितना सोचते हैं उससे ज्यादा मजबूत हैं

जिम में मिलते हैं!

{{ownerName}}
{{gymName}}`,
    },
  },
  te: {
    welcome: {
      subject: '{{gymName}}కి స్వాగతం!',
      body: `నమస్కారం {{memberName}},

{{gymName}}కి స్వాగతం! మీరు మా ఫిట్‌నెస్ కుటుంబంలో భాగం కావడం ఆనందంగా ఉంది.

మీ సభ్యత్వం ఇప్పుడు సక్రియంగా ఉంది:
- మీ ఫోన్‌లో QR కోడ్ ద్వారా చెక్-ఇన్ చేయండి
- అన్ని జిమ్ సౌకర్యాలను ఉపయోగించండి
- మీ హాజరు చరిత్రను చూడండి

కలిసి ఫిట్‌నెస్ లక్ష్యాలు సాధిద్దాం!

శుభాకాంక్షలు,
{{ownerName}}
{{gymName}}`,
    },
    renewal: {
      subject: '{{gymName}} సభ్యత్వం త్వరలో ముగుస్తుంది',
      body: `నమస్కారం {{memberName}},

{{gymName}}లో మీ సభ్యత్వం త్వరలో ముగుస్తుంది.

అంతరాయం లేని సేవ కోసం దయచేసి మీ సభ్యత్వాన్ని పునరుద్ధరించండి.

ఫిట్‌గా ఉండండి!
{{ownerName}}
{{gymName}}`,
    },
    motivation: {
      subject: '{{gymName}} నుండి సందేశం - అద్భుతంగా చేస్తున్నారు!',
      body: `నమస్కారం {{memberName}},

{{gymName}}లో మీ కృషి కనిపిస్తుంది! ఇలాగే కొనసాగించండి!

గుర్తుంచుకోండి:
- క్రమశిక్షణ తీవ్రత కంటే మెరుగు
- ప్రతి వ్యాయామం ముఖ్యమే
- మీరు అనుకున్నదానికంటే బలంగా ఉన్నారు

జిమ్‌లో కలుద్దాం!

{{ownerName}}
{{gymName}}`,
    },
  },
  ta: {
    welcome: {
      subject: '{{gymName}}க்கு வரவேற்கிறோம்!',
      body: `வணக்கம் {{memberName}},

{{gymName}}க்கு வரவேற்கிறோம்! எங்கள் உடற்பயிற்சி குடும்பத்தில் இணைந்ததில் மகிழ்ச்சி.

உங்கள் உறுப்பினர் சந்தா இப்போது செயலில் உள்ளது:
- உங்கள் தொலைபேசியில் QR குறியீடு மூலம் செக்-இன் செய்யுங்கள்
- அனைத்து ஜிம் வசதிகளையும் பயன்படுத்துங்கள்
- உங்கள் வருகை வரலாற்றைப் பாருங்கள்

சேர்ந்து உடற்பயிற்சி இலக்குகளை அடைவோம்!

வாழ்த்துக்கள்,
{{ownerName}}
{{gymName}}`,
    },
    renewal: {
      subject: '{{gymName}} சந்தா விரைவில் காலாவதியாகிறது',
      body: `வணக்கம் {{memberName}},

{{gymName}}இல் உங்கள் சந்தா விரைவில் காலாவதியாகிறது.

தடையற்ற சேவைக்கு உங்கள் சந்தாவை புதுப்பிக்கவும்.

ஆரோக்கியமாக இருங்கள்!
{{ownerName}}
{{gymName}}`,
    },
    motivation: {
      subject: '{{gymName}}இலிருந்து செய்தி - தொடருங்கள்!',
      body: `வணக்கம் {{memberName}},

{{gymName}}இல் உங்கள் முயற்சி தெரிகிறது! இப்படியே தொடருங்கள்!

நினைவில் கொள்ளுங்கள்:
- தொடர்ச்சி தீவிரத்தை விட சிறந்தது
- ஒவ்வொரு பயிற்சியும் முக்கியம்
- நீங்கள் நினைப்பதை விட வலிமையானவர்

ஜிம்மில் சந்திப்போம்!

{{ownerName}}
{{gymName}}`,
    },
  },
  kn: {
    welcome: {
      subject: '{{gymName}}ಗೆ ಸ್ವಾಗತ!',
      body: `ನಮಸ್ಕಾರ {{memberName}},

{{gymName}}ಗೆ ಸ್ವಾಗತ! ನಮ್ಮ ಫಿಟ್‌ನೆಸ್ ಕುಟುಂಬದ ಭಾಗವಾಗಿರುವುದಕ್ಕೆ ಸಂತೋಷ.

ನಿಮ್ಮ ಸದಸ್ಯತ್ವ ಈಗ ಸಕ್ರಿಯವಾಗಿದೆ:
- ನಿಮ್ಮ ಫೋನ್‌ನಲ್ಲಿ QR ಕೋಡ್ ಮೂಲಕ ಚೆಕ್-ಇನ್ ಮಾಡಿ
- ಎಲ್ಲಾ ಜಿಮ್ ಸೌಲಭ್ಯಗಳನ್ನು ಬಳಸಿ
- ನಿಮ್ಮ ಹಾಜರಾತಿ ಇತಿಹಾಸವನ್ನು ನೋಡಿ

ಒಟ್ಟಿಗೆ ಫಿಟ್‌ನೆಸ್ ಗುರಿಗಳನ್ನು ಸಾಧಿಸೋಣ!

ಶುಭಾಶಯಗಳು,
{{ownerName}}
{{gymName}}`,
    },
    renewal: {
      subject: '{{gymName}} ಸದಸ್ಯತ್ವ ಶೀಘ್ರದಲ್ಲೇ ಮುಗಿಯುತ್ತಿದೆ',
      body: `ನಮಸ್ಕಾರ {{memberName}},

{{gymName}}ನಲ್ಲಿ ನಿಮ್ಮ ಸದಸ್ಯತ್ವ ಶೀಘ್ರದಲ್ಲೇ ಮುಗಿಯುತ್ತಿದೆ.

ಅಡಚಣೆಯಿಲ್ಲದ ಸೇವೆಗಾಗಿ ದಯವಿಟ್ಟು ಸದಸ್ಯತ್ವವನ್ನು ನವೀಕರಿಸಿ.

ಫಿಟ್ ಆಗಿರಿ!
{{ownerName}}
{{gymName}}`,
    },
    motivation: {
      subject: '{{gymName}}ನಿಂದ ಸಂದೇಶ - ಮುಂದುವರಿಸಿ!',
      body: `ನಮಸ್ಕಾರ {{memberName}},

{{gymName}}ನಲ್ಲಿ ನಿಮ್ಮ ಪರಿಶ್ರಮ ಕಾಣುತ್ತಿದೆ! ಹೀಗೇ ಮುಂದುವರಿಸಿ!

ನೆನಪಿಡಿ:
- ನಿಯಮಿತತೆ ತೀವ್ರತೆಗಿಂತ ಉತ್ತಮ
- ಪ್ರತಿ ವ್ಯಾಯಾಮ ಮುಖ್ಯ
- ನೀವು ಅಂದುಕೊಂಡಿದ್ದಕ್ಕಿಂತ ಬಲಶಾಲಿ

ಜಿಮ್‌ನಲ್ಲಿ ಭೇಟಿಯಾಗೋಣ!

{{ownerName}}
{{gymName}}`,
    },
  },
};

// Get templates for a specific language, fallback to English
function getTemplatesForLang(lang) {
  return TEMPLATES[lang] || TEMPLATES.en;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTemplate(text, vars, isHtml = false) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key] || '';
    return isHtml ? escapeHtml(val) : val;
  });
}

export function getTemplates(lang = 'en') {
  const templates = getTemplatesForLang(lang);
  return Object.entries(templates).map(([key, val]) => ({
    id: key,
    subject: val.subject,
    preview: val.body.slice(0, 100) + '...',
  }));
}

export function getSupportedLanguages() {
  return [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'te', name: 'Telugu' },
    { code: 'ta', name: 'Tamil' },
    { code: 'kn', name: 'Kannada' },
  ];
}

// Generate newsletter content using AI (OpenRouter → DeepSeek → Anthropic → static)
export async function generateAIContent(gymId, { topic, tone = 'friendly' }) {
  const gym = await db('gyms').where({ id: gymId }).first();
  if (!gym) throw new NotFoundError('Gym');

  const prompt = `Write a newsletter email for a gym called "${gym.gym_name}" in ${gym.city}, India.

Topic: ${topic}
Tone: ${tone}
Owner name: ${gym.owner_name}

Requirements:
- Write a compelling subject line (just the text, no "Subject:" prefix)
- Write the email body (use {{memberName}} as placeholder for recipient name)
- Keep it concise (under 200 words)
- End with the owner's name and gym name
- Don't use markdown formatting

Format your response exactly as:
SUBJECT: <subject line>
BODY:
<email body>`;

  let text;
  let provider;

  // 1. Try OpenRouter (MiniMax) first
  if (!text && config.openrouter.enabled) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openrouter.apiKey}`,
        },
        body: JSON.stringify({
          model: 'minimax/minimax-01',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      text = data.choices?.[0]?.message?.content;
      if (text) provider = 'openrouter/minimax';
    } catch (err) {
      console.error('OpenRouter API error:', err.message);
    }
  }

  // 2. Fallback to DeepSeek
  if (!text && config.deepseek.enabled) {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.deepseek.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
        }),
      });
      const data = await res.json();
      text = data.choices?.[0]?.message?.content;
      if (text) provider = 'deepseek';
    } catch (err) {
      console.error('DeepSeek API error:', err.message);
    }
  }

  // 3. Fallback to Anthropic
  if (!text && config.anthropic.enabled) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: config.anthropic.apiKey });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      text = response.content[0].text;
      if (text) provider = 'anthropic';
    } catch (err) {
      console.error('Anthropic API error:', err.message);
    }
  }

  // 4. Static fallback
  if (!text) {
    return {
      subject: `${topic} — ${gym.gym_name}`,
      body: `Hi {{memberName}},\n\nHere's an update from ${gym.gym_name} about: ${topic}.\n\nStay fit!\n${gym.owner_name}\n${gym.gym_name}`,
      aiGenerated: false,
      message: 'No AI API key configured. Set OPENROUTER_API_KEY, DEEPSEEK_API_KEY, or ANTHROPIC_API_KEY in .env.',
    };
  }

  const subjectMatch = text.match(/SUBJECT:\s*(.+)/);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);

  return {
    subject: subjectMatch ? subjectMatch[1].trim() : `${topic} — ${gym.gym_name}`,
    body: bodyMatch ? bodyMatch[1].trim() : text,
    aiGenerated: true,
    provider,
  };
}

export async function sendNewsletter(gymId, { template, customSubject, customBody, subject: subjectField, body: bodyField, language, recipients, individualEmails, cc, bcc, replyTo, fromName, isHtml }) {
  const gym = await db('gyms').where({ id: gymId }).first();
  if (!gym) throw new NotFoundError('Gym');

  // Accept subject/body as aliases for customSubject/customBody
  const effectiveSubject = customSubject || subjectField;
  const effectiveBody = customBody || bodyField;

  const lang = language || gym.preferred_language || 'en';
  const templates = getTemplatesForLang(lang);
  const tmpl = templates[template];
  if (!tmpl && !effectiveBody) {
    throw new ValidationError('Provide a template name or custom body content');
  }

  // Build recipient list based on mode
  let memberList;
  if (recipients === 'individual' && individualEmails && individualEmails.length > 0) {
    // Send to specific email addresses — look up members by email
    memberList = await db('members')
      .where({ gym_id: gymId })
      .whereIn('email', individualEmails);

    // Also include emails not in the member list (external recipients)
    const memberEmails = new Set(memberList.map(m => m.email));
    const externalEmails = individualEmails.filter(e => !memberEmails.has(e));
    for (const email of externalEmails) {
      memberList.push({ name: email.split('@')[0], email });
    }

    if (memberList.length === 0) {
      throw new ValidationError('No valid recipients found');
    }
  } else if (recipients === 'expiring') {
    const inWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    memberList = await db('members')
      .where({ gym_id: gymId, status: 'active' })
      .whereNotNull('email').where('email', '!=', '')
      .whereIn('id', function () {
        this.select('member_id').from('memberships')
          .where({ gym_id: gymId, status: 'active' })
          .whereBetween('end_date', [today, inWeek]);
      });
  } else if (recipients === 'active') {
    memberList = await db('members')
      .where({ gym_id: gymId, status: 'active' })
      .whereNotNull('email').where('email', '!=', '');
  } else {
    memberList = await db('members')
      .where({ gym_id: gymId })
      .whereNotNull('email').where('email', '!=', '');
  }

  if (memberList.length === 0) {
    throw new ValidationError('No members with email addresses found for the selected group');
  }

  const vars = { gymName: gym.gym_name, ownerName: gym.owner_name };
  const baseSubject = effectiveSubject || (tmpl ? tmpl.subject : 'Update from your gym');
  const baseBody = effectiveBody || tmpl.body;

  let sentCount = 0;

  for (const member of memberList) {
    const memberVars = { ...vars, memberName: member.name };
    const subject = renderTemplate(baseSubject, memberVars, false);
    const body = renderTemplate(baseBody, memberVars, !!isHtml);

    if (config.email.enabled) {
      try {
        const mailOpts = {
          from: `${fromName || gym.gym_name} <${config.email.user}>`,
          to: member.email,
          subject,
        };
        if (isHtml) {
          mailOpts.html = body;
          mailOpts.text = body.replace(/<[^>]+>/g, '');
        } else {
          mailOpts.text = body;
          mailOpts.html = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; white-space: pre-line;">${body}</div>`;
        }
        await sendEmail(mailOpts);
        sentCount++;
      } catch (err) {
        console.error(`Failed to send to ${member.email}:`, err.message);
      }
    } else {
      console.log(`[DEV] Newsletter to ${member.email}: ${subject}`);
      sentCount++;
    }
  }

  const [newsletter] = await db('newsletters')
    .insert({
      gym_id: gymId,
      subject: renderTemplate(baseSubject, vars),
      body: renderTemplate(baseBody, vars),
      template: template || 'custom',
      recipients_count: sentCount,
      sent_at: new Date(),
    })
    .returning('*');

  return { newsletter, sentCount, totalMembers: memberList.length };
}

export async function getNewsletters(gymId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const newsletters = await db('newsletters')
    .where({ gym_id: gymId })
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db('newsletters').where({ gym_id: gymId }).count();

  return { newsletters, total: parseInt(count, 10), page, limit };
}
