import { Injectable, Logger } from '@nestjs/common';
import { IPaymentParser } from './parser.interface';
import {
  GojekParser,
  OVOParser,
  BCAParser,
  GrabParser,
  DanaParser,
  JeniusParser,
  JagoParser,
  DanamonParser,
  DefaultParser,
} from './strategies';

@Injectable()
export class ParserFactory {
  private readonly logger = new Logger(ParserFactory.name);
  private parsers: IPaymentParser[];

  constructor() {
    this.parsers = [
      new GojekParser(),
      new OVOParser(),
      new BCAParser(),
      new GrabParser(),
      new DanaParser(),
      new JeniusParser(),
      new JagoParser(),
      new DanamonParser(),
      new DefaultParser(), // Always last as fallback
    ];
  }

  getParser(appType: string): IPaymentParser {
    const parser = this.parsers.find((p) => p.canParse(appType));

    if (parser) {
      this.logger.log(`Selected parser: ${parser.appType} for detected app: ${appType}`);
    }

    return parser || this.parsers[this.parsers.length - 1]; // DefaultParser
  }

  /**
   * Register a new parser at runtime.
   * New parsers are added to the front for priority.
   */
  registerParser(parser: IPaymentParser): void {
    // Insert before DefaultParser (which should remain last)
    this.parsers.splice(this.parsers.length - 1, 0, parser);
    this.logger.log(`Registered new parser: ${parser.appType}`);
  }

  /**
   * Get list of all supported app types.
   */
  getSupportedApps(): string[] {
    return this.parsers
      .filter((p) => p.appType !== 'Unknown')
      .map((p) => p.appType);
  }
}
