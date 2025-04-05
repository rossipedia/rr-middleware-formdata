import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, RegisterOptions, Resolver } from 'react-hook-form';
import { data, Form, unstable_RouterContextProvider } from 'react-router';
import {
  getValidatedFormData,
  RemixFormProvider,
  useRemixForm,
  useRemixFormContext,
} from 'remix-hook-form';
import { z } from 'zod';
import { formDataMiddleware, getFormData } from '~/.server/formData.context';
import { Route } from './+types/_._index';
import clsx from 'clsx';

const FormSchema = z.object({
  email: z.string().email('Invalid email address.'),
  username: z.string().min(3, 'Username must be a minimimum of 3 characters.'),
  password: z
    .string()
    .min(12, 'Username must be a minimimum of 12 characters.'),
});

type Form = z.infer<typeof FormSchema>;

const formResolver = zodResolver(FormSchema);

export const unstable_middleware = [formDataMiddleware];

export async function action({ context }: Route.ActionArgs) {
  const { data } = await getValidatedFormSubmission(context, formResolver);
  console.log({ data });
  return { result: 'success' as const };
}

function Component({ actionData }: Route.ComponentProps) {
  const formContext = useRemixForm({
    defaultValues: {
      email: '',
      password: '',
      username: '',
    },
    resolver: formResolver,
  });

  return (
    <div className="container mx-auto max-w-sm">
      <RemixFormProvider {...formContext}>
        <Form
          method="POST"
          className="flex flex-col gap-2"
          // onSubmit={formContext.handleSubmit}
        >
          <Field name="username" placeholder="username" type="text" />
          <Field name="email" placeholder="email" type="text" />
          <Field name="password" placeholder="password" type="password" />
          <div className="flex flex-row gap-2">
            <button className="btn btn-primary">Submit</button>
          </div>
        </Form>
      </RemixFormProvider>
    </div>
  );
}

export default Component;
export const ErrorBoundary = Component;

function Field<TName extends keyof Form>({
  name,
  placeholder,
  type,
}: {
  name: TName;
  placeholder: string;
  type: 'text' | 'password';
}) {
  const {
    register,
    formState: { errors },
  } = useRemixFormContext<Form>();
  return (
    <fieldset className="fieldset">
      <input
        className={clsx('input', errors[name] && 'input-error')}
        type={type}
        placeholder={placeholder}
        {...register(name)}
      />
      <div
        className={clsx('fieldset-label text-error', {
          hidden: !errors[name],
        })}
      >
        {errors[name]?.message}
      </div>
    </fieldset>
  );
}

async function getValidatedFormSubmission<R extends FieldValues>(
  context: unstable_RouterContextProvider,
  resolver: Resolver<R>
) {
  const fd = getFormData(context);
  if (!fd) {
    throw new Response(null, { status: 400 });
  }
  const validation = await getValidatedFormData(fd, resolver);

  if (validation.errors) {
    throw data(
      { errors: validation.errors, defaultValues: validation.receivedValues },
      { status: 422 }
    );
  }

  return { data: validation.data! };
}
