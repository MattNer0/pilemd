<template lang="pug">
	.modal-mask(v-show="show")
		.modal-background(@click="clickout_close")
		.modal-wrapper
			.modal-container.modal-image(v-if="image_url")
				div(ref="imagemodal", @click="clickout_close")
			.modal-container(v-else)
				h3 {{ title }}
				p(v-html="descriptionHtml")
				form(@submit.prevent="button_submit(buttons[0])")
					.modal-prompts
						.modal-field(v-for="field in prompts")
							span.modal-field-label {{ field.label }}
							input(v-if="field.type == 'text'", type="text", v-model="field.retValue", :name="field.name", v-on:contextmenu="contextMenu")
							vue-password(v-else-if="field.type == 'password'", v-model="field.retValue", classes="input", :name="field.label")
					.modal-buttons
						template(v-for="button in buttons")
							button.modal-button(@click.prevent="button_submit(button)", type="button") {{ button.label }}
</template>

<script>
	import VuePassword from 'vue-password';
	import { remote } from "electron";

	export default {
		name: 'modal',
		data() {
			return {
				show       : false,
				title      : '',
				description: '',
				image_url  : '',
				buttons    : [],
				prompts    : [],
				okcb       : undefined
			};
		},
		components: {
			'vue-password': VuePassword
		},
		computed: {
			descriptionHtml() {
				return this.description ? this.description.replace(/\n/g,'<br/>') : '';
			},
			promptsObject() {
				var obj = {};
				for(var i = 0; i < this.prompts.length; i++) {
					obj[this.prompts[i].name] = this.prompts[i].retValue;
				}
				return obj;
			}
		},
		methods: {
			init(title, description, buttons, prompts) {
				this.title = title;
				this.description = description;
				this.buttons = buttons;
				this.prompts = prompts;
				this.image_url = '';
				this.show = true;

				setTimeout(function(){
					var pswd = document.querySelector('.VuePassword__Input input');
					if(pswd) pswd.focus();
				}, 100);
			},
			image(url) {
				this.reset_data();
				this.image_url = url;
				this.show = true;
			},
			reset_data() {
				this.title = '';
				this.description = '';
				this.buttons = [];
				this.prompts = [];
				this.image_url = '';
				this.show = false;
			},
			clickout_close() {
				if(this.buttons.length < 2 && this.prompts.length == 0) {
					this.show = false;
					this.reset_data();
				}
			},
			button_submit(button) {
				if(button.cancel) {
					this.show = false;
				} else {
					for (var i = 0; i < this.prompts.length; i++) {
						if(this.prompts[i].required && !this.prompts[i].retValue) return false;
					}
					if (button.validate) {
						var validation_failed = button.validate(this.promptsObject);
						if(validation_failed) return false;
					}
					this.show = false;
				}
				
				if(button.cb) button.cb(this.promptsObject);
				this.reset_data();
			},
			contextMenu() {
				var inputMenu = remote.Menu.buildFromTemplate([{
					label: 'Undo',
					role: 'undo',
				}, {
					label: 'Redo',
					role: 'redo',
				}, {
					type: 'separator',
				}, {
					label: 'Cut',
					role : 'cut',
				}, {
					label: 'Copy',
					role : 'copy',
				}, {
					label: 'Paste',
					role : 'paste',
				}, {
					type: 'separator',
				}, {
					label: 'Select all',
					role : 'selectall',
				}]);
				inputMenu.popup(remote.getCurrentWindow());
			}
		},
		watch: {
			image_url() {
				this.$nextTick(() => {
					if(this.$refs.imagemodal) {
						this.$refs.imagemodal.style.backgroundImage = "url('"+this.image_url+"')";
					}
				});
			}
		}
	}
</script>