declare module 'multer' {
	import { RequestHandler } from 'express';

	interface MulterOptions {
		storage?: any;
		limits?: any;
		fileFilter?: (req: any, file: any, cb: (err: null | Error, acceptFile?: boolean) => void) => void;
	}

	interface MulterInstance {
		single(fieldname: string): RequestHandler;
		array(fieldname: string, maxCount?: number): RequestHandler;
		fields(fields: Array<{ name: string; maxCount?: number }>): RequestHandler;
	}

	function multer(options?: MulterOptions): MulterInstance;
	namespace multer {
		function diskStorage(opts: any): any;
	}

	export = multer;
}

declare namespace Express {
	interface Request {
		file?: any;
		files?: any;
	}
}

