import { LoginForm } from "@/components/auth/login-form"
import { LoginImageSide } from "@/components/auth/login-image-side"

export default function LoginPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <a href="#" className="flex items-center gap-2 font-medium">
                        <div className="bg-black text-white px-3 py-1 rounded font-bold text-lg">
                            Propalyst
                        </div>
                        <span className="text-sm text-muted-foreground">Powered by RealBroker</span>
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