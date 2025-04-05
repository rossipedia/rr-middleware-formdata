import {
  UNSAFE_DataWithResponseInit,
  unstable_createContext,
  unstable_MiddlewareFunction,
  unstable_RouterContextProvider,
} from 'react-router';
import { encode } from 'turbo-stream';

const formDataContext = unstable_createContext<
  | {
      formData: FormData;
      intercept: (
        response: Response | UNSAFE_DataWithResponseInit<unknown>
      ) => Promise<never>;
    }
  | undefined
>();

export function getFormData(context: unstable_RouterContextProvider) {
  return context.get(formDataContext);
}

export const formDataMiddleware: unstable_MiddlewareFunction = async (
  { request, context },
  next
) => {
  // Check if the request is a POST reques
  const hasBody =
    request.headers.has('Content-Length') ||
    request.headers.has('Transfer-Encoding');

  if (!hasBody) {
    return next();
  }

  const contentType = request.headers.get('Content-Type');
  const isFormData =
    contentType?.startsWith('application/x-www-form-urlencoded') ||
    contentType?.startsWith('multipart/form-data');

  if (!isFormData) {
    console.log(' -> !isFormData');
    return next();
  }

  console.log(' -> isFormData, cloning request');
  const clonedRequest = request.clone();
  const fd = await clonedRequest.formData();
  console.log(' -> isFormData, setting context formData');

  const { promise, resolve } = Promise.withResolvers<
    Response | UNSAFE_DataWithResponseInit<unknown>
  >();

  const intercept = (
    response: Response | UNSAFE_DataWithResponseInit<unknown>
  ) => {
    console.log(' -> intercepting response');
    // https://i.imgflip.com/9puttn.jpg
    if ('data' in response) {
      const { data, init } = response;
      const body = encode({ data });
      response = new Response(body, {
        ...init,
        headers: {
          ...init?.headers,
          'Content-Type': 'text/x-script',
          'X-Remix-Response': 'yes',
        },
      });
    }
    resolve(response);
    return new Promise<never>(() => {});
  };

  context.set(formDataContext, {
    formData: fd,
    intercept,
  });

  console.log(' -> next()');
  const resp = await Promise.race([next(), promise]);

  if (!(resp instanceof Response) || resp.status !== 422) {
    console.log(' -> returning response unaltered');
    return resp;
  }

  console.log(' -> returning new response from', resp.status);
  const headers = new Headers(resp.headers);
  headers.append('X-Intercepted-FormData', 'true');
  return new Response(resp.body, { ...resp, headers, status: 200 });
};
