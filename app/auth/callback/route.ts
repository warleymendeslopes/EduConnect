import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/login'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get user to determine redirect
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Get user profile to determine type
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .single()
        
        if (profile?.user_type === "professor") {
          return NextResponse.redirect(`${origin}/dashboard/professor`)
        } else {
          return NextResponse.redirect(`${origin}/dashboard/aluno`)
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error?error=auth_callback_error&error_description=Nao foi possivel confirmar o email`)
}
