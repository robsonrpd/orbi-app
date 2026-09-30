import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { deveRedirecionar, ROTA_INICIAL } from '@/lib/produto'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/cadastro')
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')

  if (!user && isDashboard) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Módulos desligados (ver src/lib/produto.ts): quem digita a URL na mão, ou tem um link
  // salvo de antes, cai na tela inicial em vez de numa página de um módulo que não existe mais.
  if (user && isDashboard && deveRedirecionar(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = ROTA_INICIAL
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
