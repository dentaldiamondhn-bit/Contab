export class NextResponse {
  constructor(body, init = {}) {
    this._body = body;
    this.status = init.status ?? 200;
    this.headers = init.headers ?? {};
  }

  async json() {
    return this._body === undefined ? undefined : JSON.parse(this._body);
  }

  static json(body, init) {
    return new NextResponse(JSON.stringify(body), init);
  }
}

export class NextRequest {}

export default NextResponse;
