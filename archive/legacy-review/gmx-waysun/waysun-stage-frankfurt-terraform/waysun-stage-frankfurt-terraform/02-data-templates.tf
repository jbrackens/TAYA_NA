data "alicloud_account" "current" {
}

data "alicloud_caller_identity" "current" {
}

data "alicloud_regions" "current_region_ds" {
  current = true
}

data "alicloud_vpcs" "default" {
  is_default = true
}

data "alicloud_images" "ubuntu" {
  most_recent = true
  name_regex  = "^ubuntu_18.*64"
}

data "alicloud_images" "centos" {
  most_recent = true
  name_regex  = "^centos_7*"
}

locals {
  bastion_user_data = <<EOF
#!/bin/bash
sudo apt update
sudo apt install python3 -y
rm /usr/bin/python
sudo ln -s /usr/bin/python3 /usr/bin/python
ansible="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDJOqvROXFd2cKHW1Sj3vkW4rSbjQeqzIZEM979sBODpTriKNXGuJnpo0RNrawtiSgvdrMZtz9UlXRUbHz26RnbEgIGztRIqjID/nIoeueQwgZJATwizVax7iT78sfXVVAzbtY3YEr0NQs8yJ95n4McVntTx+thir/Nahd5p9XsOoh6bZ1HeXxFpWb7KJZTDvTu9YTjI1SkeF5A6O2mO/P/Yr+Xp9yu0g82HrEjHSRFXQ/Kx/wXCSYqzxzawGUx4gT0J4Cscm3cjfveyEtwd+U0RYkq8kUk9H2s3ZyJmNta6OPeoEIKlsvM5v47EaeZtwLzG1/PjlA75tXcUFtUPJ3L root@ansible"
echo $ansible >> ~/.ssh/authorized_keys
EOF

  nifi_user_data = <<EOF
#!/bin/bash
sudo apt update
sudo apt install python3 -y
rm /usr/bin/python
sudo ln -s /usr/bin/python3 /usr/bin/python
ansible="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDJOqvROXFd2cKHW1Sj3vkW4rSbjQeqzIZEM979sBODpTriKNXGuJnpo0RNrawtiSgvdrMZtz9UlXRUbHz26RnbEgIGztRIqjID/nIoeueQwgZJATwizVax7iT78sfXVVAzbtY3YEr0NQs8yJ95n4McVntTx+thir/Nahd5p9XsOoh6bZ1HeXxFpWb7KJZTDvTu9YTjI1SkeF5A6O2mO/P/Yr+Xp9yu0g82HrEjHSRFXQ/Kx/wXCSYqzxzawGUx4gT0J4Cscm3cjfveyEtwd+U0RYkq8kUk9H2s3ZyJmNta6OPeoEIKlsvM5v47EaeZtwLzG1/PjlA75tXcUFtUPJ3L root@ansible"
echo $ansible >> ~/.ssh/authorized_keys
UUID=$(blkid -s UUID -o value /dev/vdb)
echo "UUID=$UUID  /nifi-data  xfs  defaults,nofail  0  2" >> /etc/fstab
sudo mkdir /nifi-data
mount -a
EOF

  ansible_user_data = <<EOF
#!/bin/bash
sudo apt update
sudo apt install python3 ansible -y
rm /usr/bin/python
sudo ln -s /usr/bin/python3 /usr/bin/python
UUID=$(blkid -s UUID -o value /dev/vdb)
echo "UUID=$UUID  /ansible-data  xfs  defaults,nofail  0  2" >> /etc/fstab
sudo mkdir /ansible-data
mount -a
sudo apt upgrade -y
EOF

}

// data "alicloud_instance_types" "instance-type-nifi-registry" {
//   cpu_core_count = var.nifi_registry_instance_cpu_core_count
//   memory_size    = var.nifi_registry_instance_memory_size
// }

