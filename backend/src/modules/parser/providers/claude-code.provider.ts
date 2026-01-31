import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { IAIProvider } from './ai-provider.interface';

@Injectable()
export class ClaudeCodeProvider implements IAIProvider {
  private readonly logger = new Logger(ClaudeCodeProvider.name);
  readonly name = 'claude-code';

  async analyzeImage(
    prompt: string,
    imageData: string,
    mimeType: string,
  ): Promise<{ text: string }> {
    const ext = mimeType.split('/')[1] || 'png';
    const filename = `receipt-${randomUUID()}.${ext}`;
    const tempPath = path.join('/tmp', filename);

    try {
      // Write base64 image to temp file
      await writeFile(tempPath, Buffer.from(imageData, 'base64'));
      this.logger.log(`Temp image saved: ${tempPath}`);

      // Call claude CLI with -p (print mode, non-interactive)
      const fullPrompt = `Read and analyze the receipt image at ${tempPath}. ${prompt}`;

      const result = await this.runClaude(fullPrompt);
      return { text: result };
    } finally {
      // Cleanup temp file
      await unlink(tempPath).catch(() => {});
    }
  }

  private runClaude(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Pass prompt as argument array - no shell escaping needed
      const args = ['-p', prompt, '--allowedTools', 'Read'];

      this.logger.log(`Running claude CLI...`);
      const startTime = Date.now();

      // Spawn directly without shell to avoid prompt being interpreted as shell commands
      const child = spawn('claude', args, {
        env: {
          ...process.env,
          CI: 'true',
          TERM: 'dumb',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Close stdin immediately - we don't need to send any input
      child.stdin.end();

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        this.logger.error(`Claude CLI spawn error: ${error.message}`);
        reject(error);
      });

      child.on('close', (code, signal) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (stderr) {
          this.logger.warn(`Claude CLI stderr: ${stderr}`);
        }

        if (signal) {
          reject(new Error(`Claude CLI killed by signal: ${signal}`));
          return;
        }

        if (code !== 0) {
          reject(new Error(`Claude CLI exited with code ${code}: ${stderr || stdout}`));
          return;
        }

        this.logger.log(`Claude CLI completed in ${elapsed}s, output length: ${stdout.length}`);
        resolve(stdout);
      });

      // Set a manual timeout as backup
      const timeoutId = setTimeout(() => {
        this.logger.error('Claude CLI timeout after 3 minutes, killing process');
        child.kill('SIGTERM');
        reject(new Error('Claude CLI timeout after 3 minutes'));
      }, 180000);

      child.on('close', () => clearTimeout(timeoutId));
    });
  }
}
