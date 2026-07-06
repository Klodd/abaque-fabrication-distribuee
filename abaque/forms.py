from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

INPUT_CLASSES = (
    "w-full p-3 border border-gray-300 rounded-md focus:outline-none "
    "focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
)


class RegistrationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ("username",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].label = "Nom d'utilisateur"
        self.fields["username"].help_text = (
            "150 caractères maximum. Lettres, chiffres et @/./+/-/_ uniquement."
        )
        self.fields["password1"].label = "Mot de passe"
        self.fields["password1"].help_text = None
        self.fields["password2"].label = "Confirmation du mot de passe"
        self.fields["password2"].help_text = "Saisissez le même mot de passe que ci-dessus, pour vérification."
        for field in self.fields.values():
            field.widget.attrs["class"] = INPUT_CLASSES
