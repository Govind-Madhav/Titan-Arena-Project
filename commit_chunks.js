const { execSync } = require('child_process');
const fs = require('fs');

try {
    const statusOutput = execSync('git status --porcelain', { encoding: 'utf8' });
    const lines = statusOutput.split('\n').filter(l => l.trim().length > 0);

    console.log(`Found ${lines.length} changed files to commit.`);

    let count = 0;
    for (const line of lines) {
        const match = line.match(/^(M | M|A | A|D | D| \?|\?\?|MM|AM|RM|CM)\s+(.*)$/);
        if (!match) continue;

        let status = match[1].trim();
        let file = match[2].trim();

        if (file.startsWith('"') && file.endsWith('"')) {
            file = file.slice(1, -1);
        }
        if (file === 'commit_chunks.js' || file === 'commit_msg.txt') continue;

        try {
            if (status.includes('D')) {
                execSync(`git rm "${file}"`);
                const rmSubj = `chore(cleanup): remove deleted file ${file.split('/').pop()}`;
                const rmBody = `Removed file as it is no longer needed in the current architecture.`;
                fs.writeFileSync('commit_msg.txt', `${rmSubj}\n\n${rmBody}\n`);
                execSync(`git commit -F commit_msg.txt`);
                count++;
                console.log(`[${count}] Committed deletion of ${file}`);
                continue;
            }

            execSync(`git add "${file}"`);

            const filename = file.split('/').pop() || file;
            let domain = 'core';
            let rationale = 'Updated application logic to support recent feature enhancements.';

            if (file.includes('JAVA')) {
                domain = 'java-engine';
                rationale = 'Added or modified Java tournament engine components for backend services logic.';
            } else if (file.includes('BACKEND')) {
                domain = 'backend';
                rationale = 'Updated Node.js backend logic, API routes, or controllers to meet new requirements.';
                if (file.includes('drizzle') || file.includes('migrations')) {
                    rationale = 'Modified database schema definitions or migrations for the Drizzle ORM implementation.';
                } else if (file.includes('scripts')) {
                    rationale = 'Added or updated utility script for development or database seeding operations.';
                }
            } else if (file.includes('FRONTEND')) {
                domain = 'frontend';
                rationale = 'Updated React UI components, pages, or state management logic for user experience improvements.';
            } else if (file.endsWith('.md')) {
                domain = 'docs';
                rationale = 'Updated documentation to reflect architectural, roadmap, or codebase changes.';
            }

            let diffStat = '';
            try {
                diffStat = execSync(`git diff --cached --stat "${file}"`, { encoding: 'utf8' }).trim();
            } catch (e) { }

            let action = status.includes('A') || status.includes('??') ? 'Create' : 'Modify';
            let commitSubject = `${action === 'Create' ? 'feat' : 'chore'}(${domain}): ${action.toLowerCase()} ${filename}`;
            let commitBody = `File: ${file}\nAction: ${action}\n\nRationale:\n${rationale}\n`;

            if (diffStat && diffStat.length > 0) {
                commitBody += `\nModifications details:\n${diffStat}\n`;
            }

            fs.writeFileSync('commit_msg.txt', `${commitSubject}\n\n${commitBody}`);
            execSync(`git commit -F commit_msg.txt`);
            count++;
            console.log(`[${count}] Committed ${file}`);
        } catch (e) {
            console.error(`Failed to commit ${file}:`, e.message);
        }
    }
    console.log(`Successfully created ${count} descriptive commits.`);
} catch (e) {
    console.error('Failed to run commit script:', e);
}
