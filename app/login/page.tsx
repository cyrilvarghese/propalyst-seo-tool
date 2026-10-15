import { LoginForm } from "@/components/auth/login-form"
import { LoginImageSide } from "@/components/auth/login-image-side"
import { PropalystLogo } from "@/components/common/propalyst-logo"

export default function LoginPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <a href="#" className="block">
                        <PropalystLogo />
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <LoginForm />
                    </div>
                </div>
            </div>
            <LoginImageSide />
        </div>
    )
}