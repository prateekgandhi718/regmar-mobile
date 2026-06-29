import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { convert } from 'html-to-text';

interface FetchResult {
  emails: { content: string; date: Date; uid: number }[];
  lastUid: number;
}

export type SupportedProvider = 'gmail' | 'icloud';

const getImapHostByProvider = (provider: SupportedProvider) => {
  if (provider === 'icloud') return 'imap.mail.me.com';
  return 'imap.gmail.com';
};

export const isImapAuthError = (error: any) => {
  if (!error) return false;
  if (error.authenticationFailed) return true;
  if (error.serverResponseCode === 'AUTHENTICATIONFAILED') return true;
  const text = `${error.responseText || ''} ${error.message || ''}`;
  return /AUTHENTICATIONFAILED|Invalid credentials|authentication failed|login failed|bad credentials/i.test(text);
};

export const verifyImapCredentials = async (
  provider: SupportedProvider,
  email: string,
  appPassword: string
) => {
  const client = new ImapFlow({
    host: getImapHostByProvider(provider),
    port: 993,
    secure: true,
    auth: {
      user: email,
      pass: appPassword,
    },
    logger: false,
  });

  try {
    await client.connect();
    await client.logout();
  } catch (error) {
    try {
      await client.logout();
    } catch (logoutError) {}
    throw error;
  }
};

export const fetchEmailsIncrementally = async (
  provider: SupportedProvider,
  email: string,
  appPassword: string,
  fromEmail: string,
  lastUid: number = 0,
  limit?: number,
  since?: Date,
  keyword?: string
): Promise<FetchResult> => {
  const client = new ImapFlow({
    host: getImapHostByProvider(provider),
    port: 993,
    secure: true,
    auth: {
      user: email,
      pass: appPassword,
    },
    logger: false,
  });

  const emails: { content: string; date: Date; uid: number }[] = [];
  let newLastUid = lastUid;

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Search for emails from the specified sender
      const searchCriteria: any = { from: fromEmail };
      if (lastUid > 0) {
        searchCriteria.uid = `${lastUid + 1}:*`;
      } else if (since) {
        searchCriteria.since = since;
      }

      if (keyword) {
        searchCriteria.body = keyword;
      }

      const messages = await client.search(searchCriteria);
      
      // search returns sequence numbers.
      let targetSeqs: number[] = Array.isArray(messages) ? messages : [];
      
      // Apply limit only if explicitly provided (e.g. for fetching samples)
      if (limit && targetSeqs.length > limit) {
        targetSeqs = targetSeqs.slice(-limit);
      }

      if (targetSeqs.length > 0) {
        for (const seq of targetSeqs) {
          // Fetch by sequence number
          const message = await client.fetchOne(seq.toString(), { source: true, uid: true, envelope: true });
          if (message && message.source) {
            const parsed = await simpleParser(message.source);
            
            let content = '';
            if (parsed.text) {
              content = parsed.text;
            } else if (parsed.html) {
              // Convert HTML to text if no plain text version exists
              content = convert(parsed.html as string, {
                wordwrap: false,
                selectors: [
                  { selector: 'a', options: { ignoreHref: true } },
                  { selector: 'img', format: 'skip' }
                ]
              });
            } else if (parsed.textAsHtml) {
              content = convert(parsed.textAsHtml as string, { wordwrap: false });
            }

            const date = message.envelope?.date || parsed.date || new Date();
            
            if (content) {
              // Aggressively clean whitespace and structural junk
              const cleanedContent = content
                .replace(/\s+/g, ' ')
                .replace(/\uFFFD/g, '')
                .trim();

              emails.push({ 
                content: cleanedContent, 
                date, 
                uid: message.uid 
              });
            }
            // Use the actual UID from the message for tracking
            if (message.uid && message.uid > newLastUid) {
              newLastUid = message.uid;
            }
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error(`IMAP error for ${email}:`, error);
    try {
      await client.logout();
    } catch (e) {}
    throw error;
  }

  return { emails, lastUid: newLastUid };
};

export const fetchLatestEmailWithAttachment = async (
  provider: SupportedProvider,
  email: string,
  appPassword: string,
  fromEmail: string,
  fileNamePattern?: string
): Promise<{ attachment: Buffer | null; date: Date | null; uid: number | null }> => {
  const client = new ImapFlow({
    host: getImapHostByProvider(provider),
    port: 993,
    secure: true,
    auth: {
      user: email,
      pass: appPassword,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const searchCriteria = { from: fromEmail };
      const messages = await client.search(searchCriteria);
      
      const targetSeqs = Array.isArray(messages) ? messages : [];
      if (targetSeqs.length === 0) return { attachment: null, date: null, uid: null };

      // Get the latest one
      const latestSeq = targetSeqs[targetSeqs.length - 1];
      const message = await client.fetchOne(latestSeq.toString(), { source: true, envelope: true, uid: true });
      
      if (message && message.source) {
        const parsed = await simpleParser(message.source);
        const attachment = parsed.attachments.find(att => 
          !fileNamePattern || att.filename?.toLowerCase().includes(fileNamePattern.toLowerCase())
        );

        return {
          attachment: attachment ? attachment.content : null,
          date: message.envelope?.date || parsed.date || null,
          uid: message.uid || null
        };
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    console.error(`IMAP attachment fetch error for ${email}:`, error);
    try { await client.logout(); } catch (e) {}
    throw error;
  }

  return { attachment: null, date: null, uid: null };
};

export const fetchDiverseSamples = async (
  provider: SupportedProvider,
  email: string,
  appPassword: string,
  fromEmail: string,
  debitKeywords: string[],
  creditKeywords: string[]
): Promise<{ debitBuckets: string[][], creditBuckets: string[][] }> => {
  const client = new ImapFlow({
    host: getImapHostByProvider(provider),
    port: 993,
    secure: true,
    auth: {
      user: email,
      pass: appPassword,
    },
    logger: false,
  });

  const debitBuckets: string[][] = [];
  const creditBuckets: string[][] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const fetchBody = async (searchCriteria: any, limit: number): Promise<string[]> => {
        const messages = await client.search(searchCriteria);
        let targetSeqs: number[] = Array.isArray(messages) ? messages : [];
        if (limit && targetSeqs.length > limit) {
          targetSeqs = targetSeqs.slice(-limit);
        }

        const contents: string[] = [];
        for (const seq of targetSeqs) {
          const message = await client.fetchOne(seq.toString(), { source: true });
          if (message && message.source) {
            const parsed = await simpleParser(message.source);
            let content = '';
            if (parsed.text) {
              content = parsed.text;
            } else if (parsed.html) {
              content = convert(parsed.html as string, {
                wordwrap: false,
                selectors: [
                  { selector: 'a', options: { ignoreHref: true } },
                  { selector: 'img', format: 'skip' }
                ]
              });
            } else if (parsed.textAsHtml) {
              content = convert(parsed.textAsHtml as string, { wordwrap: false });
            }
            if (content) {
              // Aggressively clean whitespace and structural junk
              const cleanedContent = content
                .replace(/\s+/g, ' ')
                .replace(/\uFFFD/g, '')
                .trim();
              if (cleanedContent) contents.push(cleanedContent);
            }
          }
        }
        return contents;
      };

      // 1. Fetch Debit Buckets
      for (const kw of debitKeywords) {
        const samples = await fetchBody({ from: fromEmail, body: kw }, 3);
        debitBuckets.push(samples);
      }

      // 2. Fetch Credit Buckets
      for (const kw of creditKeywords) {
        const samples = await fetchBody({ from: fromEmail, body: kw }, 3);
        creditBuckets.push(samples);
      }

    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    console.error(`Diverse IMAP fetch error for ${email}:`, error);
    try { await client.logout(); } catch (e) {}
    throw error;
  }

  return { debitBuckets, creditBuckets };
};
