'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { login } from '@/lib/queries/auth';
import { axiosErrorMessage } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';

const loginSchema = z.object({
    identifier: z.string().min(1, 'Email or username is required'),
    password:   z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router      = useRouter();
    const { setUser } = useAuth();
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);

    const form = useForm<LoginForm>({
        resolver: zodResolver(loginSchema) as Resolver<LoginForm>,
        defaultValues: { identifier: '', password: '' },
    });

    async function onSubmit(values: LoginForm) {
        setError('');
        setLoading(true);
        try {
            const res = await login(values);
            setToken(res.token);
            setUser(res.user);
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(axiosErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">Welcome back</CardTitle>
                <CardDescription>Sign in to your Jointify account</CardDescription>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="identifier"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email or Username</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="juan@example.com or juandelacruz"
                                            autoComplete="username"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="••••••••"
                                            type="password"
                                            autoComplete="current-password"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        <Link
                                            href="/forgot-password"
                                            className="text-primary hover:underline"
                                        >
                                            Forgot password?
                                        </Link>
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {error && (
                            <p className="text-sm text-destructive" role="alert">{error}</p>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign in'}
                        </Button>

                    </form>
                </Form>
            </CardContent>

            <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="text-primary hover:underline">
                        Create one
                    </Link>
                </p>
            </CardFooter>
        </Card>
    );
}