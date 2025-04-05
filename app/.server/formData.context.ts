import { zodResolver } from '@hookform/resolvers/zod';
import { generateFormData } from 'remix-hook-form';
import {
  unstable_createContext,
  unstable_MiddlewareFunction,
  unstable_RouterContextProvider,
} from 'react-router';

const formDataContext = unstable_createContext<FormData | undefined>();

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
  context.set(formDataContext, fd);

  console.log(' -> next()');
  const resp = await next();

  if (!(resp instanceof Response) || resp.status !== 422) {
    console.log(' -> returning response unaltered');
    return resp;
  }

  console.log(' -> returning new response from', resp.status);
  const headers = new Headers(resp.headers);
  headers.append('X-Intercepted-FormData', 'true');
  return new Response(resp.body, { ...resp, headers, status: 200 });
};
