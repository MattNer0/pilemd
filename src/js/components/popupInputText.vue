<template lang="pug">
	form(@submit="submitForm($event)")
		.my-search
			input#search-bar(v-model="input_data", type="text", :placeholder="placeholder", @keydown.enter.exact.prevent="submitForm($event)")
			i.material-icons(v-show="input_data", @click="clear_input") clear
		.my-buttons
			.my-button(v-for="button in buttons")
				button(type="buttonType(button)", @click="buttonClick($event, button)")
					| {{ button.label }}
</template>

<script>
	export default {
		name: 'inputText',
		data() {
			return {
				input_data: ""
			};
		},
		props: {
			'required'     : Boolean,
			'placeholder'  : String,
			'buttons'      : Array
		},
		computed: {
			formData() {
				return {
					input_data: this.input_data
				};
			},
			submitButton() {
				var submits = this.buttons.filter((obj) => {
					return obj.type == "submit";
				});
				if (submits.length > 0) {
					return submits[0];
				}
				return null;
			}
		},
		methods: {
			clear_input() {
				this.input_data = "";
			},
			buttonType(button_obj) {
				if (button_obj.type == "submit") {
					return "submit";
				}
				return "button";
			},
			buttonClick(event, button_obj) {
				switch(button_obj.type) {
					case "close":
						this.$root.closingWindow();
						break;
					case "submit":
						this.submitForm(event);
						break;
				}
				return false;
			},
			errorFlash(event, message) {
				if (event) event.preventDefault();
				console.log(message);
				return;
			},
			submitForm(event) {
				if (this.required && this.input_data.length == 0) {
					return this.errorFlash(event, "required");
				}

				if (this.submitButton && typeof this.submitButton.validate == "function") {
					var result = this.submitButton.validate(this.formData);
					if (result) {
						return this.errorFlash(event, "not valid "+result);
					}
				}

				if (this.submitButton && typeof this.submitButton.callback == "function") {
					this.submitButton.callback(this.formData);
				}

				this.$root.inputSubmit(this.formData);
			},
		},
	}
</script>