Symple Slicer Profile Specification
===================================

The Symple Slicer profiles consist of two parts:

1. A collection of profile lists
2. A collection of profile files

At Symple Slicer startup, the profile lists are loaded from one or more URLs, according to the URL list
at "Advanced Features -> Data Sources -> Profile URLs". The profile lists are used to populate the drop
down menus in the UI. The profile list(s) determine:

* Which pull down menus are shown in the "Select Profiles" panel.
* How pull down menu items are made visible or hidden depending on the values of other pull down menus. 
* Which profile files are applied for particular selections of the pull down menus.

When the user selects his or her choices from the pull down menus and clicks the "Apply" button,
one or more profile files are then retrieved and applied. Generally, there will be two files
applied, one profile file for the machine and one profile file for the material, although this
can be changed.

The Profile Lists
-----------------

A profile list is a TOML file with any of following sections. Sections can be referred to
by **constraints**, which are explained later in this document.

Section                | Drop-Down Menu  | Constraint   | Description
-----------------------| ----------------|--------------|------------------------------------------
machine_manufacturers  | Manufacturer:   | manufacturer | A list of machine make
machine_profiles       | Printer:        | machine      | A list of machines models
machine_upgrades       | Upgrades:       | upgrade      | A list of modifications or variants
machine_toolheads      | Toolhead:       | toolhead     | A list of machine toolheads
print_quality          | Quality:        | quality      | A list of finish qualities
material_brands        | Material Brand: | brand        | A list of material brands or vendors
print_profiles&dagger; | Material:       |    -         | A list of print profiles (i.e. materials)

_&dagger; Symple Slicer calls "Material" profiles "print_profiles" because in practice,
a good profile is dependent on particulars of the material, toolhead and printer._

A profile list can contain as many or as few of these sections as necessary. If a
section appears in any of the profile lists, a corresponding drop down menu will appear
in the "Select Profiles" panel. For all drop down menus except "Printer" and "Material",
if the user has less than two choices to pick from, that particular drop down menu will
be hidden. This keeps the UI uncluttered when there aren't any choices to be made.

The contents of each TOML file section are keys and values, separated by an equal sign.
The text after the pound sign is a comment. In the following examples, we use the comment
to show you the default URL for the corresponding profile file. Example:

```
[machine_manufacturers]
syndaver  = "SynDaver"
ultimaker = "Ultimaker"

[machine_profiles]
syndaver_axi_1 = "SynDaver Axi"       # machine_profiles/syndaver_axi_1.toml
syndaver_axi_2 = "SynDaver Axi 2"     # machine_profiles/syndaver_axi_2.toml
ultimaker_s3   = "Ultimaker S3"       # machine_profiles/ultimaker_s3.toml
```

This example causes two drop down menus to appear in the UI. The quoted words to
the right of the equal sign is what the user will see. In this example, these two
menus are independent and choosing a printer manufacturer from the drop down
has no effect on choices of machines.

These examples use a *short form* which allows multiple items to be listed under
one section heading. The *short form* can be used when each item only has a name
and no other attribute. In *long form*, each item has a subsection in the TOML
file and can have one or more attributes. Example:

```
[machine_profiles.syndaver_axi_1]     # machine_profiles/syndaver_axi_1.toml
name           = "SynDaver Axi"

[machine_profiles.syndaver_axi_2]     # machine_profiles/syndaver_axi_2.toml
name           = "SynDaver Axi 2"

[machine_profiles.ultimaker_s3]       # machine_profiles/ultimaker_s3.toml
name           = "Ultimaker S3"
```

The use of *long form* allows more information to be associated with each item.
We can use a **constraint** to cause the items in one drop down menu to only be
shown when a *specific choice* is made in another drop down menu. This interlinks
the menus and makes their contents dynamic. Example:

``` 
[machine_manufacturers]
syndaver  = "SynDaver"
ultimaker = "Ultimaker"

[machine_profiles.syndaver_axi_1]     # machine_profiles/syndaver_axi_1.toml
name           = "SynDaver Axi"
manufacturer   = "syndaver"

[machine_profiles.syndaver_axi_2]     # machine_profiles/syndaver_axi_2.toml
name           = "SynDaver Axi 2"
manufacturer   = "syndaver"

[machine_profiles.ultimaker_s3]       # machine_profiles/ultimaker_s3.toml
name           = "Ultimaker S3"
manufacturer   = "ultimaker"
```

In this example, if the user selects "SynDaver" from the "Manufacturer" drop down
menu, they will be able to choose either "SynDaver Axi" or "SynDaver Axi 2" from
the "Printer" menu. If they select "Ultimaker", only "Ultimaker S3" will
show up in the "Printer" menu.

Constraints can be used to give the user different print profiles based on the
values of other drop down menus. This could be useful to make specialized profiles
for specific printers. Example:

```
[print_profiles.generic_pla]          # print_profiles/generic_pla.toml
name           = "PLA"

[print_profiles.axi_1_pla]            # print_profiles/axi_1_pla.toml
name           = "PLA"
machine        = "syndaver_axi_1"

[print_profiles.axi_2_pla]            # print_profiles/axi_2_pla.toml
name           = "PLA"
machine        = "syndaver_axi_2"
```

In this case, there is a generic PLA profile as well as two specialized PLA
profiles for SynDaver machines. The user will see "PLA" in the Material menu,
but what profile file is used will depend on their selections for Machine.

Multiple constraints can be combined to make a very specific print profile:

```
[material_brands]
polymaker     = "PolyMaker"

[print_quality]
best          = "Slowest (0.1 layers)"
fast          = "Fastest (0.3 layers)"

[print_profiles.poly_pla_best]        # print_profiles/poly_pla_best.toml
name          = "PLA"
brand         = "polymaker"
quality       = "best"

[print_profiles.poly_pla_fast]        # print_profiles/poly_pla_fast.toml
name          = "PLA"
brand         = "polymaker"
quality       = "fast"
```

In this example, when the "Material Brand" is "PolyMaker", one of two profiles
will used depending on the choice of "Print Quality"

For any items in "machine_profiles" and "print_profiles" section, the "url"
has a default. In some circumstances, it may be useful to change that default:

```
[print_profiles.pla]
name         = "PLA"
url          = "some_directory/some_profile.toml"
```

Similarly, it may make sense to have the other drop down menus, besides Printer
and Material, load profile files. This can be used to load different firmware
depending on the toolhead selection; or perhaps a choice from the Quality menu
could tweak certain slicer settings. Example:

```
[machine_toolheads.single_toolhead]
name         = "Single Toolhead"
url          = "toolhead_profiles/single_toolhead.toml"

[machine_toolheads.dual_toolhead]
name         = "Dual Toolhead"
url          = "toolhead_profiles/dual_toolhead.toml"

[print_quality.best]
name         = "Best Print"
url          = "quality_profiles/best.toml"

[print_quality.fast]
name         = "Fastest Print"
url          = "quality_profiles/fast.toml"
```

By combining constraints and profile files URLs, it is possible to build menu
trees for complex situations.

Refer to [profiles/profile_list_complex.toml] for more examples.

The Profile Files
-----------------

For any items in "machine_profiles" and "print_profiles" section, the "url" fields
is automatically set to a TOML file in the corresponding directory. Those two profile
files will be read and loaded when the user clicks "Apply" button in the "Select
Profile" screen. The resulting configuration is the *combination* of all settings
from these files.

For any items not in the "machine_profiles" and "print_profiles" section, no profile
files will be read unless the URL is assigned, as documented above. The drop down menus
can thus be programmed to invoke profile files to cover many different use cases.

The profile files can contain any of the following sections. Some of these sections
only apply to Symple Slicer Desktop, while others apply to both Symple Slicer Web and
Desktop, as indicated:

Section              | Applies To | Description
---------------------|------------|-------------------------------------
metadata             | both       | Information about the profile
usb                  | desktop    | Settings for tethered printing
wireless             | desktop    | Settings for wireless printing
scripts              | desktop    | G-code scripts
settings             | both       | Settings for Cura Engine

Refer to the following examples file for descriptions of the fields in each section:

* [machine_profiles/example_with_comments.toml]
* [print_profiles/example_with_comments.toml]

Note that sections and fields can appear in any profile file, regardless of
type. Where it makes sense to do so depends on what you are trying to acheive;
when reading profile files, Symple Slicer treats them all as one large file.

[machine_profiles/example_with_comments.toml]: https://github.com/SynDaverCO/symple-slicer/tree/master/src-app/config/profiles/machine_profiles/example_with_comments.toml
[print_profiles/example_with_comments.toml]: https://github.com/SynDaverCO/symple-slicer/tree/master/src-app/config/profiles/print_profiles/example_with_comments.toml
[profiles/profile_list_complex.toml]: https://github.com/SynDaverCO/symple-slicer/tree/master/src-app/config/profiles/profile_list_complex.toml