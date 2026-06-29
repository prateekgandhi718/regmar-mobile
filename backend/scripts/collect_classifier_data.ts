/**
 * Collect raw emails from various bank domains for classifier training.
 * 
 * Usage:
 *   npx ts-node scripts/collect_classifier_data.ts <user_email> <app_password> <output_file>
 * 
 * Example:
 *   npx ts-node scripts/collect_classifier_data.ts user@gmail.com xxxx-xxxx-xxxx-xxxx classifier_raw_emails.jsonl
 * 
 * Output: JSONL file with { fromEmail, emailBody, label: null } for manual labeling
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { convert } from 'html-to-text';
import * as fs from 'fs';
import * as path from 'path';

interface EmailRecord {
  fromEmail: string;
  emailBody: string;
  label: null | 1 | 0; // null = unlabeled, 1 = transaction, 0 = non-transaction
  date: string;
  uid: number;
}

// Bank domains to collect from
const BANK_DOMAINS = [
  'alerts@hdfcbank.net',
  'alerts@axis.bank.in',
  'credit_cards@icicibank.com',
  'alert@kotak.com',
];

async function fetchEmailsFromBank(
  email: string,
  appPassword: string,
  fromEmail: string,
  limit: number = 50
): Promise<EmailRecord[]> {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: email,
      pass: appPassword,
    },
    logger: false,
  });

  const records: EmailRecord[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const searchCriteria = { from: fromEmail };
      const messages = await client.search(searchCriteria);

      let targetSeqs: number[] = Array.isArray(messages) ? messages : [];

      if (limit && targetSeqs.length > limit) {
        targetSeqs = targetSeqs.slice(-limit);
      }

      console.log(`  Found ${targetSeqs.length} emails from ${fromEmail}`);

      for (const seq of targetSeqs) {
        try {
          const message = await client.fetchOne(seq.toString(), {
            source: true,
            uid: true,
            envelope: true,
          });

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
                  { selector: 'img', format: 'skip' },
                ],
              });
            } else if (parsed.textAsHtml) {
              content = convert(parsed.textAsHtml as string, { wordwrap: false });
            }

            const date = message.envelope?.date || parsed.date || new Date();

            if (content) {
              const cleanedContent = content
                .replace(/\s+/g, ' ')
                .replace(/\uFFFD/g, '')
                .trim();

              if (cleanedContent.length > 20) {
                records.push({
                  fromEmail,
                  emailBody: cleanedContent,
                  label: null,
                  date: date.toISOString(),
                  uid: message.uid || 0,
                });
              }
            }
          }
        } catch (err) {
          console.error(`  Error parsing message: ${err}`);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    console.error(`Error fetching from ${fromEmail}:`, error);
  }

  return records;
}

async function main() {
  const userEmail = process.argv[2];
  const appPassword = process.argv[3];
  const outputFile = process.argv[4] || 'classifier_raw_emails.jsonl';

  if (!userEmail || !appPassword) {
    console.error('Usage: npx ts-node scripts/collect_classifier_data.ts <email> <app_password> [output_file]');
    process.exit(1);
  }

  console.log(`Collecting emails from ${BANK_DOMAINS.length} bank domains...`);
  console.log(`Output: ${outputFile}\n`);

  const allRecords: EmailRecord[] = [];

  for (const domain of BANK_DOMAINS) {
    console.log(`Fetching from ${domain}...`);
    const records = await fetchEmailsFromBank(userEmail, appPassword, domain, 50);
    allRecords.push(...records);
    console.log(`  Collected ${records.length} emails\n`);
  }

  // Write to JSONL
  const outputPath = path.join(__dirname, '..', 'ml_data', outputFile);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const stream = fs.createWriteStream(outputPath);
  for (const record of allRecords) {
    stream.write(JSON.stringify(record) + '\n');
  }
  stream.end();

  console.log(`\n✓ Collected ${allRecords.length} total emails`);
  console.log(`✓ Saved to: ${outputPath}`);
  console.log('\nNext step: Label emails using prelabel_classifier_data.py');
}

main().catch(console.error);
