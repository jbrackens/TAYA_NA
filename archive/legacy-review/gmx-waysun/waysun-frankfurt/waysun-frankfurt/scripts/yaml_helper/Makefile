.MAIN: install

install: yaml_helper.sh
	mkdir -p /etc/yaml_helper/lib
	cp -f yaml_helper.sh /etc/yaml_helper/
	cp -r ./lib/* /etc/yaml_helper/lib
	ln -sf /etc/yaml_helper/yaml_helper.sh /usr/local/bin/yaml_helper
	chmod 770 /usr/local/bin/yaml_helper
